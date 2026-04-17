// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from "fs";
import { resolve } from "path";
import { FileSpec, LicenseConfig, OverrideLicenseEntry } from "./license-config";
import { findFirstLicenseFile, findFirstNoticeFile } from "./find-license-files";
import { LicenseItem } from "./license-report-template";
import { PnpmLicensesReport, walkProjectLocations } from "./pnpm-license-report";
import { createConsoleLogger, getChalk, SILENT_LOGGER } from "@open-pioneer/build-common";

/**
 * Iterates over the results of the given license report.
 * For valid projects, we read the license (and optionally notice) files and use them to build {@link LicenseItem} objects.
 * All license items are then returned as an array.
 *
 * When an invalid project (e.g. missing license) is encountered, we report an error to the console and return `error: true`.
 *
 * The `config` argument supports local overrides for packages that do not have their license detected properly.
 *
 * `thisDir` is the directory of the calling script, used to resolve "custom" file paths.
 */
export async function analyzeLicenses(
    reportJson: PnpmLicensesReport,
    config: LicenseConfig,
    thisDir: string,
    log: boolean
): Promise<{
    error: boolean;
    items: LicenseItem[];
}> {
    const logger = log ? await createConsoleLogger(console) : SILENT_LOGGER;
    const chalk = await getChalk();

    let unknownLicenses = false;
    let disallowedLicenses = false;
    let missingLicenseText = false;

    const usedOverrides = new Set<OverrideLicenseEntry>();
    const getOverrideEntry = (name: string, version: string) => {
        const entry = config.overrideLicenses?.find(
            (e) => e.name === name && e.version === version
        );
        if (entry) {
            usedOverrides.add(entry);
        }
        return entry;
    };

    const reportProjects = Object.values(reportJson).flat();
    const items: LicenseItem[] = [];
    reportProjects.forEach((project, index) => {
        const name = project.name;

        for (const { path, version } of walkProjectLocations(project)) {
            const overrideEntry = getOverrideEntry(name, version);
            const dependencyInfo = `'${name}' (version: ${version})`;
            const licenses = overrideEntry?.license ?? project.license;
            const licenseFiles = overrideEntry?.licenseFiles ?? findFirstLicenseFile(path);
            const noticeFiles = overrideEntry?.noticeFiles ?? findFirstNoticeFile(path);

            if (!overrideEntry?.license) {
                if (!licenses || licenses === "Unknown") {
                    unknownLicenses = true;
                    logger.warn(
                        chalk.yellow(
                            `Failed to detect licenses of dependency ${dependencyInfo} at ${path}`
                        )
                    );
                } else if (!config.allowedLicenses.includes(licenses)) {
                    disallowedLicenses = true;
                    logger.warn(
                        chalk.yellow(
                            `License '${licenses}' of dependency ${dependencyInfo} is not allowed by configuration.`
                        )
                    );
                }
            }

            const readProjectFile = (file: FileSpec) => {
                const basedir = ((file: FileSpec): string => {
                    switch (file.type) {
                        case "custom":
                            return thisDir;
                        case "package":
                            return path;
                    }
                })(file);
                const projectFilePath = resolve(basedir, file.path);
                try {
                    return readFileSync(projectFilePath, "utf-8");
                } catch (e) {
                    throw new Error(
                        `Failed to read license file for project ${dependencyInfo} at ${projectFilePath}: ${e}`
                    );
                }
            };

            const licenseTexts = licenseFiles.map(readProjectFile);
            if (licenseTexts.length === 0) {
                logger.warn(
                    chalk.yellow(
                        `Failed to detect license text of dependency ${dependencyInfo} in ${path}`
                    )
                );
                missingLicenseText = true;
            }

            const noticeTexts = noticeFiles.map(readProjectFile);
            const item: LicenseItem = {
                id: `dep-${index}-${version}`,
                name: name,
                license: licenses,
                version: version,
                licenseText: licenseTexts.join("\n\n"),
                noticeText: noticeTexts.join("\n\n")
            };
            items.push(item);
        }
    });

    if (config.overrideLicenses) {
        for (const overrideEntry of config.overrideLicenses) {
            if (!usedOverrides.has(overrideEntry)) {
                logger.warn(
                    chalk.yellow(
                        `License override for dependency '${overrideEntry.name}' (version(s): ${overrideEntry.version}) was not used, it should either be updated or removed.`
                    )
                );
            }
        }
    }

    const error = unknownLicenses || disallowedLicenses || missingLicenseText;
    return { error, items };
}

/**
 * `thisDir` is the directory of the calling script, used to resolve "custom" file paths.
 */
export async function getAdditionalLicenses(
    config: LicenseConfig,
    itemCount: number,
    thisDir: string,
    log: boolean
): Promise<{
    additionalError: boolean;
    additionalItems: LicenseItem[];
}> {
    const logger = log ? await createConsoleLogger(console) : SILENT_LOGGER;
    const chalk = await getChalk();
    if (!config.additionalLicenses)
        return {
            additionalError: false,
            additionalItems: []
        };

    const items: LicenseItem[] = [];
    let unknownLicenses = false;
    let disallowedLicenses = false;
    let missingLicenseText = false;

    config.additionalLicenses.forEach((license) => {
        const name = license.name;
        const version = license.version;
        const licenseSpec = license.license;

        if (!licenseSpec || licenseSpec === "Unknown") {
            unknownLicenses = true;
            logger.warn(
                chalk.yellow(
                    `Failed to detect licenses of dependency ${name} at "additionalLicenses" configuration`
                )
            );
        } else if (!config.allowedLicenses.includes(licenseSpec)) {
            disallowedLicenses = true;
            logger.warn(
                chalk.yellow(
                    `License '${licenseSpec}' of dependency ${name} is not allowed by configuration.`
                )
            );
        }

        const licenseTexts =
            license.licenseFiles?.map((file) => {
                if (file.type === "custom" && file.path) {
                    try {
                        return readFileSync(resolve(thisDir, file.path), "utf-8");
                    } catch (e) {
                        throw new Error(
                            `Failed to read license file for project ${name} at ${file.path}: ${e}`
                        );
                    }
                } else {
                    logger.warn(
                        chalk.yellow(
                            `Failed to detect license text of dependency ${name} in at "additionalLicenses" configuration`
                        )
                    );
                    missingLicenseText = true;
                }
            }) || [];

        const item: LicenseItem = {
            id: `dep-${itemCount}-${name}`,
            name: name,
            version: version,
            license: licenseSpec,
            licenseText: licenseTexts.join("\n\n"),
            noticeText: ""
        };
        itemCount++;
        items.push(item);
    });

    const error = unknownLicenses || disallowedLicenses || missingLicenseText;
    return {
        additionalError: error,
        additionalItems: items
    };
}
