// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "fs";
import { resolve } from "path";
import { createConsoleLogger, getChalk, Logger, SILENT_LOGGER } from "@open-pioneer/cli-logging";
import spdxExpressionParse from "spdx-expression-parse";
import spdxSatisfies from "spdx-satisfies";
import { findFirstLicenseFile, findFirstNoticeFile } from "./findLicenseFiles";
import { PnpmLicenseProject, walkProjectLocations } from "./pnpmLicenseReport";
import { FileSpec, ReadProjectConfig, OverrideLicenseEntry } from "./readProjectConfig";
import { LicenseItem } from "./reportTemplate";

interface DependencyEntry {
    id: string;
    name: string;
    version: string | undefined;
    license: string | undefined;
    /** Disk path of the package on disk; used to auto-detect license/notice files */
    packagePath: string | undefined;
    /** Explicit license files; if undefined and packagePath is set, files are auto-detected */
    licenseFiles: FileSpec[] | undefined;
    /** Explicit notice files; if undefined and packagePath is set, files are auto-detected */
    noticeFiles: FileSpec[] | undefined;
}

/**
 * Iterates over the results of the given license report.
 * For valid projects, we read the license (and optionally notice) files and build {@link LicenseItem} objects.
 *
 * When an invalid project (e.g. missing license) is encountered, we report an error and return `error: true`.
 *
 * The `config` argument supports local overrides and additional licenses not detected by pnpm.
 * `configDirectory` is the directory of the configuration file, used to resolve custom license files.
 */
export async function verifyLicenses(
    projects: PnpmLicenseProject[],
    config: ReadProjectConfig,
    configDirectory: string,
    log: boolean
): Promise<{
    error: boolean;
    items: LicenseItem[];
}> {
    const logger = log ? await createConsoleLogger(console) : SILENT_LOGGER;
    const chalk = await getChalk();

    let hasError = false;
    const usedOverrides = new Set<OverrideLicenseEntry>();

    // set overrides from own config
    const getOverrideEntry = (name: string, version: string) => {
        const entry = config.overrideLicenses?.find(
            (e) => e.name === name && e.version === version
        );
        if (entry) {
            usedOverrides.add(entry);
        }
        return entry;
    };

    const entries: DependencyEntry[] = [];
    let index = 0;

    // check every output from pnpm and save entry
    for (const project of projects) {
        for (const { path, version } of walkProjectLocations(project)) {
            const overrideEntry = getOverrideEntry(project.name, version);
            entries.push({
                id: `dep-${index++}`,
                name: project.name,
                version,
                license: overrideEntry?.license ?? project.license,
                packagePath: path,
                licenseFiles: overrideEntry?.licenseFiles,
                noticeFiles: overrideEntry?.noticeFiles
            });
        }
    }

    // add additional licenses from own config
    for (const additional of config.additionalLicenses ?? []) {
        entries.push({
            id: `dep-${index++}`,
            name: additional.name,
            version: additional.version,
            license: additional.license,
            packagePath: undefined,
            licenseFiles: additional.licenseFiles,
            noticeFiles: undefined
        });
    }

    const context: ProcessEntryContext = { config, configDirectory, logger, chalk };
    const items: LicenseItem[] = [];
    for (const entry of entries) {
        const result = processEntry(entry, context);
        if (result.hasError) hasError = true;
        items.push(result.item);
    }

    // check if overrides are not used anymore
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

    items.sort((a, b) => a.name.localeCompare(b.name));
    return { error: hasError, items };
}

/**
 * If `license` is not a valid SPDX expression (e.g. `"UNLICENSED"`),
 * falls back to an exact string match.
 */
function isLicenseAllowed(license: string, allowedLicenses: string[]): boolean {
    try {
        return spdxSatisfies(license, allowedLicenses);
    } catch {
        return allowedLicenses.includes(license);
    }
}

function isOrExpression(license: string): boolean {
    try {
        return containsOrConjunction(spdxExpressionParse(license));
    } catch {
        return false;
    }
}

function containsOrConjunction(info: ReturnType<typeof spdxExpressionParse>): boolean {
    if (!("conjunction" in info)) {
        return false;
    }
    return (
        info.conjunction === "or" ||
        containsOrConjunction(info.left) ||
        containsOrConjunction(info.right)
    );
}

interface ProcessEntryContext {
    config: ReadProjectConfig;
    configDirectory: string;
    logger: Logger;
    chalk: Awaited<ReturnType<typeof getChalk>>;
}

function processEntry(
    entry: DependencyEntry,
    { config, configDirectory, logger, chalk }: ProcessEntryContext
): { item: LicenseItem; hasError: boolean } {
    const dependencyInfo = `'${entry.name}'${entry.version ? ` (version: ${entry.version})` : ""}`;
    let hasError = false;

    const license = entry.license;
    if (!license || license === "Unknown") {
        hasError = true;
        logger.warn(
            chalk.yellow(
                `Failed to detect licenses of dependency ${dependencyInfo}${entry.packagePath ? ` at ${entry.packagePath}` : ""}`
            )
        );
    } else if (isOrExpression(license) && !config.allowedLicenses.includes(license)) {
        hasError = true;
        // "OR" expressions are ambiguous, they leave the actual license choice open
        logger.warn(
            chalk.yellow(
                `License '${license}' of dependency ${dependencyInfo} combines multiple licenses with 'OR'. ` +
                    `Please decide for one of the licenses, either by adding an override for this dependency ` +
                    `to overrideLicenses, or by adding '${license}' to allowedLicenses.`
            )
        );
    } else if (!isLicenseAllowed(license, config.allowedLicenses)) {
        hasError = true;
        logger.warn(
            chalk.yellow(
                `License '${license}' of dependency ${dependencyInfo} is not allowed by configuration.`
            )
        );
    }

    const resolvedLicenseFiles =
        entry.licenseFiles ?? (entry.packagePath ? findFirstLicenseFile(entry.packagePath) : []);
    const resolvedNoticeFiles =
        entry.noticeFiles ?? (entry.packagePath ? findFirstNoticeFile(entry.packagePath) : []);

    const readFile = (file: FileSpec): string => {
        const basedir = file.type === "custom" ? configDirectory : (entry.packagePath ?? "");
        const filePath = resolve(basedir, file.path);
        try {
            return readFileSync(filePath, "utf-8");
        } catch (e) {
            throw new Error(
                `Failed to read license file for project ${dependencyInfo} at ${filePath}: ${e}`,
                { cause: e }
            );
        }
    };

    const licenseTexts = resolvedLicenseFiles.map(readFile);
    if (licenseTexts.length === 0) {
        hasError = true;
        logger.warn(
            chalk.yellow(
                `Failed to detect license text of dependency ${dependencyInfo}${entry.packagePath ? ` in ${entry.packagePath}` : ""}`
            )
        );
    }

    const noticeTexts = resolvedNoticeFiles.map(readFile);

    const item: LicenseItem = {
        id: `${entry.id}-${entry.version ?? entry.name}`,
        name: entry.name,
        version: entry.version,
        license: license ?? "Unknown",
        licenseText: licenseTexts.join("\n\n"),
        noticeText: noticeTexts.join("\n\n")
    };

    return { item, hasError };
}
