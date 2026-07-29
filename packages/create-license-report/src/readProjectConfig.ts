// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from "fs";
import { load as loadYaml } from "js-yaml";
import { z } from "zod";

export interface ReadProjectConfig {
    allowedLicenses: string[];

    /**
     * Skip dev dependencies when creating the report.
     * Defaults to `true` when not set in the config file (backwards compatible).
     */
    skipDevDependencies: boolean;

    overrideLicenses: OverrideLicenseEntry[] | undefined;
    additionalLicenses: AdditionalLicensesEntry[] | undefined;
}

export interface OverrideLicenseEntry {
    /** Project name */
    name: string;

    /** Exact project version */
    version: string;

    /** Manual license name */
    license?: string;

    /** License files, relative to dependency dir or config dir */
    licenseFiles?: FileSpec[];

    /** Notice files, relative to dependency dir or config dir */
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
     * package: path is relative to the package's directory on disk.
     * custom: path is relative to the config file's directory.
     */
    type: "package" | "custom";
    path: string;
}

function nullish<T extends z.ZodTypeAny>(schema: T) {
    return z.preprocess((v) => (v === null ? undefined : v), schema);
}

const FileSpecSchema = z.union([
    z.string().transform((s) => ({ type: "package" as const, path: s })),
    z
        .object({ package: z.string() })
        .transform((o) => ({ type: "package" as const, path: o.package })),
    z
        .object({ custom: z.string() })
        .transform((o) => ({ type: "custom" as const, path: o.custom }))
]);

const OverrideLicenseEntrySchema = z.object({
    name: z.string(),
    version: z.string(),
    license: z.string().optional(),
    licenseFiles: nullish(z.array(FileSpecSchema).optional()),
    noticeFiles: nullish(z.array(FileSpecSchema).optional())
});

const AdditionalLicensesEntrySchema = z.object({
    name: z.string(),
    version: z.string().optional(),
    license: z.string(),
    licenseFiles: z
        .array(z.object({ custom: z.string() }))
        .transform((files) => files.map((f) => ({ type: "custom" as const, path: f.custom })))
});

const LicenseConfigSchema = z.object({
    allowedLicenses: z.array(z.string()),
    skipDevDependencies: nullish(z.boolean().optional().default(true)),
    overrideLicenses: nullish(z.array(OverrideLicenseEntrySchema).optional()),
    additionalLicenses: nullish(z.array(AdditionalLicensesEntrySchema).optional())
});

/**
 * Reads the license config yaml file.
 */
export function readLicenseConfig(path: string): ReadProjectConfig {
    try {
        const content = readFileSync(path, "utf-8");
        const rawConfig = loadYaml(content);
        const result = LicenseConfigSchema.safeParse(rawConfig);
        if (!result.success) {
            const messages = result.error.issues
                .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
                .join("\n");
            throw new Error(`Invalid license config:\n${messages}`);
        }
        return result.data as ReadProjectConfig;
    } catch (e) {
        throw new Error(`Failed to read license config from ${path}: ${e}`);
    }
}
