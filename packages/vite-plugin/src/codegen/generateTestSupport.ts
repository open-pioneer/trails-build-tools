// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { AnalyzedPackage } from "../metadata/Metadata";
import { ReportableError } from "../ReportableError";
import { constDeclaration, exportNamed, jsonToExpression, literal, printProgram } from "./ast";
import { collectI18nMessages, I18nMessageCommonOptions, I18nPackageMetadata } from "./generateI18n";

export interface TestSupportOptions {
    /** The package that imports the module. */
    rootPackage: Pick<AnalyzedPackage, "name" | "locales">;

    /** The requested message locale, or undefined for the root package's first locale. */
    locale: string | undefined;

    /** All packages in the dependency graph of the root package (including the root). */
    packages: I18nPackageMetadata[];

    loadI18n: I18nMessageCommonOptions["loadI18n"];
}

/**
 * Generates the `open-pioneer:test-support` module for a package.
 *
 * It exports the messages of the root package and of its dependencies.
 * A root package without locales gets an empty messages object and an empty locale.
 */
export async function generateTestSupport(options: TestSupportOptions): Promise<string> {
    const { rootPackage, packages, loadI18n } = options;
    const locale = resolveLocale(rootPackage, options.locale);
    const messages = locale
        ? await collectI18nMessages({ mode: "test", locale, packages, loadI18n })
        : {};
    return printProgram([
        exportNamed(constDeclaration("messages", jsonToExpression(messages)), {
            comment: `Messages for locale '${locale}', keyed by package name and message id`
        }),
        exportNamed(constDeclaration("messageLocale", literal(locale)), {
            comment: "The message locale that matches `messages`."
        })
    ]);
}

function resolveLocale(
    rootPackage: TestSupportOptions["rootPackage"],
    requestedLocale: string | undefined
): string {
    const declaredLocales = rootPackage.locales;
    if (requestedLocale == null) {
        return declaredLocales[0] ?? "";
    }
    if (!declaredLocales.includes(requestedLocale)) {
        const declared = declaredLocales.join(", ") || "none";
        throw new ReportableError(
            `Package '${rootPackage.name}' does not define i18n messages for locale '${requestedLocale}' (declared locales: ${declared}).`
        );
    }
    return requestedLocale;
}
