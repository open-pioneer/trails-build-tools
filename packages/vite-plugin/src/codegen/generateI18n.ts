// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { AnalyzedPackage } from "../metadata/Metadata";
import { I18nFile } from "../metadata/parseI18nYaml";
import { ReportableError } from "../ReportableError";
import {
    array,
    arrow,
    call,
    constDeclaration,
    dynamicImport,
    exportDefault,
    exportNamed,
    functionDeclaration,
    identifier,
    literal,
    member,
    newExpression,
    printProgram,
    returnStatement,
    switchCase,
    switchStatement,
    template,
    throwStatement
} from "./ast";
import { serializeModuleId } from "./shared";

/**
 * Generates a lookup table for the languages supported by the given application.
 */
export function generateI18nIndex(packageDirectory: string, locales: string[]): string {
    const locale = identifier("locale");

    // case "<locale>": return import("<module>").then((mod) => mod.default);
    const cases = locales.map((localeName) => {
        const moduleId = serializeModuleId({
            type: "app-i18n",
            packageDirectory,
            locale: localeName
        });
        const loadModule = call(member(dynamicImport(moduleId), "then"), [
            arrow(["mod"], member(identifier("mod"), "default"))
        ]);
        return switchCase(literal(localeName), [returnStatement(loadModule)]);
    });

    return printProgram([
        exportNamed(constDeclaration("locales", array(locales.map(literal))), {
            comment: "Locales supported by the application"
        }),
        // export function loadMessages("locale") { ... }
        exportNamed(
            functionDeclaration(
                "loadMessages",
                ["locale"],
                [
                    switchStatement(locale, cases),
                    throwStatement(
                        newExpression("Error", [template`Unsupported locale: '${locale}'`])
                    )
                ]
            ),
            { comment: "Lazily loads the messages for the given locale" }
        )
    ]);
}

export type I18nPackageMetadata = Pick<AnalyzedPackage, "name" | "i18nPaths">;

export type I18nMessageOptions = I18nMessageCommonOptions & I18nMessageModeOptions;

export interface I18nMessageCommonOptions {
    /** The locale to generate. */
    locale: string;

    /** All packages in the dependency graph (including the root package). */
    packages: I18nPackageMetadata[];

    /** Called by the function when the contents of an i18n file (in i18nPaths) is required. */
    loadI18n: (pkg: I18nPackageMetadata, filePath: string) => Promise<I18nFile>;
}

export type I18nMessageModeOptions = I18nAppModeOptions | I18nTestModeOptions;

/**
 * Messages for a running app, used during development of an app and during production builds.
 *
 * All packages must provide messages i18n messages in the requested locale.
 * After gathering all messages, app overrides are applies to those messages.
 */
export interface I18nAppModeOptions {
    mode: "app";

    /**
     * The name of the current application.
     * Used to detect the application package for overrides.
     */
    appName: string;
}

/**
 * Messages for tests of the root package.
 * Overrides are ignored and a package without the requested locale is ignored.
 */
export interface I18nTestModeOptions {
    mode: "test";
}

/** Package name -> message id -> message template. */
export type I18nMessagesRecord = Record<string, Record<string, string>>;

/**
 * Generates a messages module containing a single default export: the messages record.
 *
 * Messages are taken from the given packages (for the specified locale).
 */
export async function generateI18nMessages(options: I18nMessageOptions): Promise<string> {
    const allMessages = await collectI18nMessages(options);

    // Transport the object as a json string for improved parsing performance
    const serialized = JSON.stringify(allMessages);
    return printProgram([
        // const messages = JSON.parse("...")
        constDeclaration(
            "messages",
            call(member(identifier("JSON"), "parse"), [literal(serialized)]),
            {
                comment: `Messages for locale '${options.locale}', keyed by package name and message id`
            }
        ),
        // export default messages
        exportDefault(identifier("messages"))
    ]);
}

/**
 * Collects the messages of all packages for the given locale, keyed by package name and message id.
 */
export async function collectI18nMessages(
    options: I18nMessageOptions
): Promise<I18nMessagesRecord> {
    const { locale, packages, loadI18n } = options;
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

        // oxlint-disable-next-line no-await-in-loop
        const { messages, overrides } = await loadI18n(pkg, filePath);
        if (options.mode === "app") {
            if (pkg.name === options.appName) {
                packageOverrides = overrides;
            } else if (overrides) {
                throw new ReportableError(
                    `Unexpected 'overrides' block in '${filePath}'. Overrides are only supported in the app.`
                );
            }
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
    if (options.mode === "app") {
        for (const packageName of packagesNeedingMessages) {
            const messages = packageMessages.get(packageName);
            if (!messages) {
                throw new ReportableError(
                    `Package '${packageName}' does not support locale '${locale}'. Either update the package or add messages from the app via 'overrides'.`
                );
            }
        }
    }

    const allMessages: I18nMessagesRecord = {};
    for (const [packageName, messages] of packageMessages.entries()) {
        allMessages[packageName] = Object.fromEntries(messages.entries());
    }
    return allMessages;
}
