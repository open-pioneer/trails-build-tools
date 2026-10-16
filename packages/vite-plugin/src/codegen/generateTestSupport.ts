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
 */
export async function generateTestSupport(options: TestSupportOptions): Promise<string> {
    const { rootPackage, packages, loadI18n } = options;
    const locale = resolveLocale(rootPackage, options.locale);
    const messages = await collectI18nMessages({ mode: "test", locale, packages, loadI18n });
    return printProgram([
        exportNamed(constDeclaration("testMessages", jsonToExpression(messages)), {
            comment: `Messages for locale '${locale}', keyed by package name and message id`
        }),
        exportNamed(constDeclaration("testMessagesLocale", literal(locale)))
    ]);
}

function resolveLocale(
    rootPackage: TestSupportOptions["rootPackage"],
    requestedLocale: string | undefined
): string {
    const declaredLocales = rootPackage.locales;
    if (declaredLocales.length === 0) {
        throw new ReportableError(
            `Package '${rootPackage.name}' does not define any i18n messages.`
        );
    }

    if (requestedLocale == null) {
        return declaredLocales[0] as string;
    }
    if (!declaredLocales.includes(requestedLocale)) {
        throw new ReportableError(
            `Package '${rootPackage.name}' does not define i18n messages for locale '${requestedLocale}' (declared locales: ${declaredLocales.join(", ")}).`
        );
    }
    return requestedLocale;
}
