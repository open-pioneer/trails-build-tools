// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { PublishConfig, ValidationOptions } from "@open-pioneer/build-support";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { shouldGenerateTypes } from "../buildDts";

export interface ResolvedOptions {
    /** Package source directory. */
    packageDirectory: string;

    /** Destination directory. */
    outputDirectory: string;

    /** True: erase {@link outputDirectory} before building the package. */
    clean: boolean;

    /** True: warnings become fatal. */
    strict: boolean;

    /** True: enable generation of .map files for all supported file types. */
    sourceMaps: boolean;

    /** True: Enable generation of .d.ts files */
    types: boolean;

    /** Validation options during the build. */
    validation: Required<ValidationOptions>;
}

export type ResolvedValidationOptions = Required<ValidationOptions>;

export async function resolveOptions(
    packageDirectory: string,
    opts: PublishConfig | undefined
): Promise<ResolvedOptions> {
    packageDirectory = resolve(packageDirectory);
    if (!existsSync(packageDirectory)) {
        throw new Error(`Package directory ${packageDirectory} does not exist.`);
    }

    const outputDirectory = join(packageDirectory, "dist");
    const clean = true;
    const strict = opts?.strict ?? true;
    const sourceMaps = opts?.sourceMaps ?? true;
    const types = await shouldGenerateTypes(packageDirectory, opts?.types);
    const validation: ResolvedValidationOptions = {
        requireReadme: true,
        requireLicense: true,
        requireChangelog: true,
        ...opts?.validation
    };
    return {
        packageDirectory,
        outputDirectory,
        clean,
        strict,
        sourceMaps,
        types,
        validation
    };
}
