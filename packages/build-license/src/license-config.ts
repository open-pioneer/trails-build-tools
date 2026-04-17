// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from "fs";
import { load as loadYaml } from "js-yaml";

export interface LicenseConfig {
    allowedLicenses: string[];
    overrideLicenses: OverrideLicenseEntry[] | undefined;
    additionalLicenses: AdditionalLicensesEntry[] | undefined;
}

export interface OverrideLicenseEntry {
    /** Project name */
    name: string;

    /** Exact project version(s) */
    version: string;

    /** Manual license name */
    license?: string;

    /** License files, relative to dependency dir */
    licenseFiles?: FileSpec[];

    /** Notice files, relative to dependency dir */
    noticeFiles?: FileSpec[];
}

export interface AdditionalLicensesEntry {
    /** Project name, does not need to match package name */
    name: string;

    /** Exact project version(s), optional. */
    version?: string;

    /** Manual license name */
    license: string;

    /** License files */
    licenseFiles: FileSpec[];
}

export interface FileSpec {
    /**
     * project: path is relative to the package's directory on disk.
     * custom: path is relative to this script.
     */
    type: "package" | "custom";
    path: string;
}

interface RawLicenseConfig {
    allowedLicenses: string[];
    overrideLicenses?: RawOverrideEntry[];
    additionalLicenses?: RawAdditionalEntry[];
}

interface RawOverrideEntry {
    name: string;
    version: string;
    license?: string;
    licenseFiles?: unknown[];
    noticeFiles?: unknown[];
}

interface RawAdditionalEntry {
    name: string;
    version?: string;
    license: string;
    licenseFiles: Array<{ custom: string }>;
}

/**
 * Reads the license config yaml file.
 */
export function readLicenseConfig(path: string): LicenseConfig {
    try {
        const content = readFileSync(path, "utf-8");
        const rawConfig = loadYaml(content) as unknown as RawLicenseConfig;

        return {
            allowedLicenses: rawConfig.allowedLicenses,
            overrideLicenses: rawConfig.overrideLicenses?.map(
                (rawEntry): OverrideLicenseEntry => ({
                    name: rawEntry.name,
                    version: rawEntry.version,
                    license: rawEntry.license,
                    licenseFiles: readFileSpecs(rawEntry.licenseFiles),
                    noticeFiles: readFileSpecs(rawEntry.noticeFiles)
                })
            ),
            additionalLicenses: rawConfig.additionalLicenses?.map(
                (rawEntry): AdditionalLicensesEntry => ({
                    name: rawEntry.name,
                    version: rawEntry.version,
                    license: rawEntry.license,
                    licenseFiles: rawEntry.licenseFiles.map((file) => ({
                        type: "custom",
                        path: file.custom
                    }))
                })
            )
        };
    } catch (e) {
        throw new Error(`Failed to read license config from ${path}: ${e}`);
    }
}

function readFileSpecs(rawSpecs: unknown[] | undefined): FileSpec[] | undefined {
    if (!rawSpecs) return undefined;

    const readRawSpec = (rawSpec: unknown): FileSpec => {
        if (typeof rawSpec === "string") return { type: "package", path: rawSpec };
        if (typeof rawSpec === "object" && rawSpec !== null) {
            const r = rawSpec as Record<string, unknown>;
            if (typeof r["package"] === "string") return { type: "package", path: r["package"] };
            if (typeof r["custom"] === "string") return { type: "custom", path: r["custom"] };
        }
        throw new Error(`Invalid file spec: ${JSON.stringify(rawSpec, undefined, 4)}`);
    };

    return rawSpecs.map(readRawSpec);
}
