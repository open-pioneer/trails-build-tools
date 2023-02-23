// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import * as nodes from "@babel/types";
import template from "@babel/template";
import { appLocaleFileId } from "./shared";
import generate from "@babel/generator";
import { PackageMetadata } from "../metadata/MetadataRepository";
import { ReportableError } from "../ReportableError";
import { I18nFile } from "../metadata/parseI18nYaml";

const INDEX_TEMPLATE = template.program(`
    export const locales = %%LOCALES_ARRAY%%;

    export function loadMessages(locale) {
        %%LOCALE_SWITCH%%
        throw new Error(\`Unsupported locale: '\${locale}'\`);
    }
`);

const IMPORT_TEMPLATE = template.statement(`
    return import(%%MODULE_ID%%).then(mod => mod.default);
`);

const MESSAGES_TEMPLATE = template.program(`
    const messages = JSON.parse(%%SERIALIZED%%);
    export default messages;
`);

/**
 * Generates a lookup table for the languages supported by the given application.
 */
export function generateI18nIndex(importer: string, locales: string[]): string {
    const localesArray = nodes.arrayExpression(
        locales.map((locale) => nodes.stringLiteral(locale))
    );
    const switchStmt = nodes.switchStatement(
        nodes.identifier("locale"),
        locales.map((locale) => {
            const localeModuleId = appLocaleFileId(importer, locale);
            const importStatement = IMPORT_TEMPLATE({
                MODULE_ID: nodes.stringLiteral(localeModuleId)
            });
            return nodes.switchCase(nodes.stringLiteral(locale), [importStatement]);
        })
    );

    const program = INDEX_TEMPLATE({
        LOCALES_ARRAY: localesArray,
        LOCALE_SWITCH: switchStmt
    });
    return generate(program).code;
}

export interface I18nMessageOptions {
    /** The locale to generate. */
    locale: string;

    /** The name of the current application. */
    appName: string;

    /** All packages in the application (including the app). */
    packages: Pick<PackageMetadata, "name" | "i18nPaths">[];

    /** Called by the function when the contents of an i18n file (in i18nPaths) is required. */
    loadI18n: (path: string) => Promise<I18nFile>;
}

/**
 * Generates a messages module containing a single default export: the messages record.
 *
 * Messages are taken from the given packages (for the specified locale).
 */
export async function generateI18nMessages(options: I18nMessageOptions): Promise<string> {
    const { locale, appName, packages, loadI18n } = options;
    const packageMessages = new Map<string, Map<string, string>>();
    const packagesNeedingMessages = new Set<string>();
    let packageOverrides: Map<string, Map<string, string>> | undefined;
    for (const pkg of packages) {
        if (pkg.i18nPaths.size !== 0) {
            // Remember packages that have i18n settings. If they are not supported
            // in a given language, and the app does not specify custom messages for this package, an error is emitted.
            packagesNeedingMessages.add(pkg.name);
        }

        const filePath = pkg.i18nPaths.get(locale);
        if (!filePath) {
            continue;
        }

        const { messages, overrides } = await loadI18n(filePath);
        if (overrides.size !== 0) {
            if (pkg.name !== appName) {
                throw new ReportableError(
                    `Unexpected 'overrides' block in '${filePath}'. Overrides are only supported in the app.`
                );
            }
            packageOverrides = overrides;
        }

        packageMessages.set(pkg.name, messages);
    }

    // Override messages
    if (packageOverrides) {
        for (const [packageName, messages] of packageOverrides.entries()) {
            const existingMessages = packageMessages.get(packageName);
            if (!existingMessages) {
                packageMessages.set(packageName, messages);
                continue;
            }

            const updatedMessages = new Map([...existingMessages, ...messages]);
            packageMessages.set(packageName, updatedMessages);
        }
    }

    // Verify that required messages are present
    for (const packageName of packagesNeedingMessages) {
        const messages = packageMessages.get(packageName);
        if (!messages) {
            throw new ReportableError(
                `Package '${packageName}' requires messages for locale '${locale}'. Either update the package or add messages from the app via 'overrides'.`
            );
        }
    }

    // Translate to json for codegen. Package name -> key -> i18n message template
    const allMessages: Record<string, Record<string, string>> = {};
    for (const [packageName, messages] of packageMessages.entries()) {
        allMessages[packageName] = Object.fromEntries(messages.entries());
    }

    // Transport the object as a json string for improved parsing performance
    const serialized = JSON.stringify(allMessages);
    const program = MESSAGES_TEMPLATE({
        SERIALIZED: nodes.stringLiteral(serialized)
    });
    return generate(program).code;
}
