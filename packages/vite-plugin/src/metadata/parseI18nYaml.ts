// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0

import { readFile } from "fs/promises";
import { load as loadYaml } from "js-yaml";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { ReportableError } from "../ReportableError";

export interface I18nFile {
    /**
     * Direct messages for the current package.
     *
     * Key: message id, Value: message template string
     */
    messages: Map<string, string>;

    /**
     * Overrides for other packages.
     * Can be used from an app.
     *
     * Key: package name, Value: message record as in {@link messages}.
     */
    overrides: Map<string, Map<string, string>>;
}

interface RawI18nFile {
    messages?: RecursiveMessages | null | undefined;
    overrides?: Record<string, RecursiveMessages> | null | undefined;
}

interface RecursiveMessages {
    [key: string]: string | RecursiveMessages;
}

const MESSAGES_SCHEMA: z.ZodType<RecursiveMessages> = z.lazy(() =>
    z.record(z.union([z.string(), MESSAGES_SCHEMA]))
);

// allow null for empty yaml objects
const I18N_SCHEMA: z.ZodType<RawI18nFile> = z
    .object({
        messages: MESSAGES_SCHEMA.or(z.null()).optional(),
        overrides: z.record(MESSAGES_SCHEMA).or(z.null()).optional()
    })
    .strict();

/**
 * Loads an i18n.yaml file from the file system and parses it.
 */
export async function loadI18nFile(path: string): Promise<I18nFile> {
    let content;
    try {
        content = await readFile(path, "utf-8");
    } catch (e) {
        throw new ReportableError(`Failed to read ${path}: ${e}`);
    }

    try {
        const data = loadYaml(content);
        return parseI18nFile(data);
    } catch (e) {
        throw new ReportableError(`Failed to parse ${path}: ${e}`);
    }
}

/**
 * Parses the JavaScript object representing an i18n file.
 */
export function parseI18nFile(data: unknown): I18nFile {
    const result = I18N_SCHEMA.safeParse(data);
    if (!result.success) {
        throw fromZodError(result.error);
    }

    const rawI18n = result.data;
    return {
        messages: gatherMessages(rawI18n.messages ?? undefined),
        overrides: gatherOverrides(rawI18n.overrides ?? undefined)
    };
}

function gatherMessages(data: RecursiveMessages | undefined): Map<string, string> {
    const messages = new Map<string, string>();
    const prefix: string[] = [];
    const visitChildren = (record: RecursiveMessages) => {
        for (const [key, value] of Object.entries(record)) {
            if (typeof value === "string") {
                visitMessage(key, value);
            } else if (value) {
                prefix.push(key);
                visitChildren(value);
                prefix.pop();
            }
        }
    };
    const visitMessage = (key: string, message: string) => {
        const id = [...prefix, key].join(".");
        if (messages.has(id)) {
            throw new Error(`Message '${id}' was already defined.`);
        }
        messages.set(id, message);
    };

    if (data) {
        visitChildren(data);
    }
    return messages;
}

function gatherOverrides(
    data: Record<string, RecursiveMessages> | undefined
): Map<string, Map<string, string>> {
    const overrides = new Map<string, Map<string, string>>();
    if (data) {
        for (const [key, value] of Object.entries(data)) {
            overrides.set(key, gatherMessages(value));
        }
    }
    return overrides;
}