// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { readFile } from "fs/promises";
import { load as loadYaml } from "js-yaml";
import { z } from "zod";
import { createErrorMap, fromZodError } from "zod-validation-error";
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
    overrides: Map<string, Map<string, string>> | undefined;
}

interface RawI18nFile {
    messages?: RecursiveMessages | null | undefined;
    overrides?: Record<string, RecursiveMessages | null | undefined> | null | undefined;
}

interface RecursiveMessages {
    [key: string]: null | undefined | string | RecursiveMessages;
}

const MESSAGES_SCHEMA: z.ZodType<RecursiveMessages | null | undefined> = z.lazy(() =>
    z
        .record(
            z.string(),
            z.union([z.string(), MESSAGES_SCHEMA], {
                error: "String or a nested record of messages"
            })
        )
        .nullish()
);

// allow null for empty yaml objects
const I18N_SCHEMA: z.ZodType<RawI18nFile | null | undefined> = z
    .strictObject({
        messages: MESSAGES_SCHEMA.nullish().optional(),
        overrides: z.record(z.string(), MESSAGES_SCHEMA).nullish().optional()
    })
    .nullish();

/**
 * Loads an i18n.yaml file from the file system and parses it.
 */
export async function loadI18nFile(path: string): Promise<I18nFile> {
    let content;
    try {
        content = await readFile(path, "utf-8");
    } catch (e) {
        throw new ReportableError(`Failed to read ${path}`, { cause: e });
    }

    try {
        return parseI18nYaml(content);
    } catch (e) {
        throw new ReportableError(`Failed to parse ${path}`, { cause: e });
    }
}

/**
 * Parses an i18n yaml document.
 */
export function parseI18nYaml(yaml: string): I18nFile {
    const data = loadYaml(yaml);
    return parseI18nFile(data);
}

const ERROR_MAP = createErrorMap();

/**
 * Parses the JavaScript object representing an i18n file.
 */
export function parseI18nFile(data: unknown): I18nFile {
    const result = I18N_SCHEMA.safeParse(data, {
        error: ERROR_MAP
    });
    if (!result.success) {
        throw fromZodError(result.error);
    }

    const rawI18n = result.data;
    const messages = gatherMessages(rawI18n?.messages ?? undefined);
    let overrides;
    if (typeof rawI18n?.overrides === "object") {
        overrides = gatherOverrides(rawI18n?.overrides ?? undefined);
    }
    return { messages, overrides };
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
    data: Record<string, RecursiveMessages | null | undefined> | undefined
): Map<string, Map<string, string>> {
    const overrides = new Map<string, Map<string, string>>();
    if (data) {
        for (const [key, value] of Object.entries(data)) {
            const messages = gatherMessages(value ?? undefined);
            overrides.set(key, messages);
        }
    }
    return overrides;
}
