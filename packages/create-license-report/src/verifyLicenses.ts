// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Logger } from "@open-pioneer/cli-common";
import { checkLicense, LicenseCheckResult } from "./checkLicense";
import { findFirstLicenseFile, findFirstNoticeFile } from "./findLicenseFiles";
import { PnpmLicenseProject, walkProjectLocations } from "./pnpmLicenseReport";
import { FileSpec, LicenseConfig, OverrideLicenseEntry } from "./readLicenseConfig";
import { LicenseItem } from "./reportTemplate";

export interface VerifyLicensesOptions {
    /** Dependencies reported by pnpm. */
    projects: PnpmLicenseProject[];

    config: LicenseConfig;

    /** Directory of the config file, used to resolve custom license files. */
    configDirectory: string;

    logger: Logger;
}

export interface VerifyLicensesResult {
    /** False if at least one dependency has a missing or disallowed license, or no license text. */
    ok: boolean;

    /** Report entries for all dependencies, sorted by name and version. */
    items: LicenseItem[];
}

/** A dependency after the config was applied, before its license files are read. */
interface DependencyEntry {
    name: string;
    version: string | undefined;
    license: string | undefined;
    /** Disk path of the package; used to auto-detect license/notice files */
    packagePath: string | undefined;
    /** Explicit license files; if undefined and packagePath is set, files are auto-detected */
    licenseFiles: FileSpec[] | undefined;
    /** Explicit notice files; if undefined and packagePath is set, files are auto-detected */
    noticeFiles: FileSpec[] | undefined;
}

/**
 * Checks the license of every dependency against the config and reads the license (and notice) texts
 * for the report.
 * Problems are logged as warnings and reported through `ok: false`, the affected dependency is still
 * part of the result.
 */
export function verifyLicenses(options: VerifyLicensesOptions): VerifyLicensesResult {
    const { config, configDirectory, logger } = options;
    const entries = collectEntries(options);

    let ok = true;
    const items: LicenseItem[] = [];
    for (const entry of entries) {
        const dependencyInfo = formatDependency(entry);

        const result = checkLicense(entry.license, config.allowedLicenses);
        if (result !== "allowed") {
            ok = false;
            logger.warn(getLicenseErrorMessage(result, entry, dependencyInfo));
        }

        const { licenseText, noticeText } = readLicenseTexts(entry, configDirectory);
        if (!licenseText) {
            ok = false;
            logger.warn(
                `Failed to detect license text of dependency ${dependencyInfo}${entry.packagePath ? ` in ${entry.packagePath}` : ""}`
            );
        }

        items.push({
            name: entry.name,
            version: entry.version,
            license: entry.license ?? "Unknown",
            licenseText,
            noticeText
        });
    }

    items.sort(
        (a, b) => a.name.localeCompare(b.name) || (a.version ?? "").localeCompare(b.version ?? "")
    );
    return { ok, items };
}

/**
 * Combines the pnpm report with the config:
 * `overrideLicenses` replaces what pnpm detected for a dependency,
 * `additionalLicenses` adds entries pnpm does not know about.
 * Overrides that match no dependency are reported as warnings.
 */
function collectEntries({ projects, config, logger }: VerifyLicensesOptions): DependencyEntry[] {
    const usedOverrides = new Set<OverrideLicenseEntry>();
    const findOverride = (name: string, version: string) => {
        const entry = config.overrideLicenses?.find(
            (e) => e.name === name && e.version === version
        );
        if (entry) {
            usedOverrides.add(entry);
        }
        return entry;
    };

    const entries: DependencyEntry[] = [];
    for (const project of projects) {
        for (const { path, version } of walkProjectLocations(project)) {
            const override = findOverride(project.name, version);
            entries.push({
                name: project.name,
                version,
                license: override?.license ?? project.license,
                packagePath: path,
                licenseFiles: override?.licenseFiles,
                noticeFiles: override?.noticeFiles
            });
        }
    }
    for (const additional of config.additionalLicenses ?? []) {
        entries.push({
            name: additional.name,
            version: additional.version,
            license: additional.license,
            packagePath: undefined,
            licenseFiles: additional.licenseFiles,
            noticeFiles: undefined
        });
    }

    for (const override of config.overrideLicenses ?? []) {
        if (!usedOverrides.has(override)) {
            logger.warn(
                `License override for dependency '${override.name}' (version: ${override.version}) was not used, it should either be updated or removed.`
            );
        }
    }
    return entries;
}

/**
 * Reads the configured license and notice files of the entry.
 * Without configured files, the package directory is searched for well known file names.
 */
function readLicenseTexts(
    entry: DependencyEntry,
    configDirectory: string
): { licenseText: string; noticeText: string } {
    const licenseFiles =
        entry.licenseFiles ?? (entry.packagePath ? findFirstLicenseFile(entry.packagePath) : []);
    const noticeFiles =
        entry.noticeFiles ?? (entry.packagePath ? findFirstNoticeFile(entry.packagePath) : []);

    const readFile = (file: FileSpec): string => {
        const basedir = file.type === "custom" ? configDirectory : (entry.packagePath ?? "");
        const filePath = resolve(basedir, file.path);
        try {
            return readFileSync(filePath, "utf-8");
        } catch (e) {
            throw new Error(
                `Failed to read license file for project ${formatDependency(entry)} at ${filePath}: ${e}`,
                { cause: e }
            );
        }
    };
    return {
        licenseText: licenseFiles.map(readFile).join("\n\n"),
        noticeText: noticeFiles.map(readFile).join("\n\n")
    };
}

function getLicenseErrorMessage(
    result: Exclude<LicenseCheckResult, "allowed">,
    entry: DependencyEntry,
    dependencyInfo: string
): string {
    switch (result) {
        case "unknown":
            return `Failed to detect licenses of dependency ${dependencyInfo}${entry.packagePath ? ` at ${entry.packagePath}` : ""}`;
        case "ambiguous":
            return (
                `License '${entry.license}' of dependency ${dependencyInfo} combines multiple licenses with 'OR'. ` +
                `Please decide for one of the licenses, either by adding an override for this dependency ` +
                `to overrideLicenses, or by adding '${entry.license}' to allowedLicenses.`
            );
        case "not-allowed":
            return `License '${entry.license}' of dependency ${dependencyInfo} is not allowed by configuration.`;
    }
}

function formatDependency(entry: DependencyEntry): string {
    return `'${entry.name}'${entry.version ? ` (version: ${entry.version})` : ""}`;
}
