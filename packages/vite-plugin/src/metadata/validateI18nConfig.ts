// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { ReportableError } from "../ReportableError";
import { createDebugger } from "../utils/debug";
import { fileExists } from "../utils/fileUtils";
import { AppMetadata, MetadataContext, PackageMetadata } from "./Metadata";
import { MetadataRepository } from "./MetadataRepository";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:validateI18nConfig");

export async function validateI18nConfig(
    ctx: MetadataContext,
    repository: MetadataRepository,
    appMetadata: AppMetadata
) {
    const locales = appMetadata.locales;
    for (const pkg of appMetadata.packages) {
        isDebug && debug("Checking i18n files of package %s", pkg.name);
        await checkPackageI18nFiles(ctx, pkg, locales);
    }

    await checkAppI18n(ctx, repository, appMetadata);
}

async function checkPackageI18nFiles(
    ctx: MetadataContext,
    pkg: PackageMetadata,
    locales: string[]
) {
    for (const locale of locales) {
        const filePath = pkg.i18nPaths.get(locale);
        if (!filePath) {
            // Not an error: package does not support a locale that is supported by the app.
            // The app _could_ override this.
            isDebug && debug("Package does not support locale '%s'", locale);
            continue;
        }

        isDebug && debug("Checking i18n file %s", filePath);

        ctx.addWatchFile(filePath);
        if (!(await fileExists(filePath))) {
            throw new ReportableError(
                `I18n file in package '${pkg.name}' for locale '${locale}' does not exist: '${filePath}'.`
            );
        } else {
            isDebug && debug("i18n file %s exists", filePath);
        }
    }
}

async function checkAppI18n(
    ctx: MetadataContext,
    repository: MetadataRepository,
    appMetadata: AppMetadata
) {
    const appPackage = appMetadata.appPackage;
    const appLocales = new Set(appMetadata.locales);

    // Fetch app i18n files to detect whether an app overrides messages for a package.
    // key: locale
    const appI18nFiles = await Promise.all(
        Array.from(appLocales).map((locale) => {
            const i18nPath = appPackage.i18nPaths.get(locale);
            if (i18nPath == null) {
                throw new Error(
                    `App package '${appPackage.name}' does not have an i18n file for locale '${locale}'.`
                );
            }
            return repository.getI18nFile(ctx, i18nPath);
        })
    );
    const errors: PackageMetadata[] = [];
    for (const pkg of appMetadata.packages) {
        const pkgLocales = pkg.locales;

        // If a package does not use i18n features: no error.
        if (pkgLocales.length === 0) {
            continue;
        }

        // If the application directly supports any of the package's locales, there is no error.
        if (pkg.locales.some((locale) => appLocales.has(locale))) {
            continue;
        }

        // If the application overrides the package's i18n messages for any locale, there is no error.
        if (appI18nFiles.some((i18nFile) => i18nFile.overrides?.get(pkg.name))) {
            continue;
        }

        errors.push(pkg);
    }
    if (errors.length === 0) {
        return;
    }

    errors.sort((p1, p2) => p1.name.localeCompare(p2.name, "en"));
    const getPackageErrors = () => {
        const MAX = 3;
        const take = Math.min(errors.length, MAX);
        const remaining = errors.length - take;

        // Report errors for the first `take` packages
        let buffer = "";
        for (let i = 0; i < take; ++i) {
            if (i > 0) {
                buffer += ", ";
            }

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const pkg = errors[i]!;
            buffer += `'${pkg.name}' (${pkg.locales.toSorted().join(", ")})`;
        }

        if (remaining > 0) {
            buffer += ` (and ${remaining} more)`;
        }
        return buffer;
    };

    const formattedAppLocales = appMetadata.locales.join(", ") || "none";
    const formattedPackageErrors = getPackageErrors();
    throw new ReportableError(
        `Invalid i18n configuration in application at ${appMetadata.directory}:\n` +
            `There is no match between the locales supported by the application (${formattedAppLocales}) and the locales ` +
            `supported by the packages ${formattedPackageErrors}.`
    );
}
