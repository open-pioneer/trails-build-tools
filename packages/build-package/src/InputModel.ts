// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { BUILD_CONFIG_NAME, BuildConfig, loadBuildConfig } from "@open-pioneer/build-common";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ValidationOptions } from "../types";

export interface InputModel {
    /** Path to the package's source directory. */
    packageDirectory: string;

    /** Parsed package.json. */
    packageJson: Record<string, unknown>;

    /** Path to package.json (for log messages). */
    packageJsonPath: string;

    /** Parsed build.config.mjs */
    buildConfig: BuildConfig;

    /** Path to build.config file (for log messages). */
    buildConfigPath: string;

    /** Validation options that shall be applied during the build. */
    validation: Required<ValidationOptions>;
}

export async function createInputModel(
    packageDirectory: string,
    validation: Required<ValidationOptions>
): Promise<InputModel> {
    if (!existsSync(packageDirectory)) {
        throw new Error(`Package directory ${packageDirectory} does not exist.`);
    }

    const packageJsonPath = resolve(packageDirectory, "package.json");
    const packageJson = await loadPackageJson(packageJsonPath);
    const buildConfigPath = resolve(packageDirectory, BUILD_CONFIG_NAME);
    const buildConfig = await loadBuildConfig(buildConfigPath);
    return createInputModelFromData({
        packageDirectory,
        packageJsonPath,
        packageJson,
        buildConfigPath,
        buildConfig,
        validation
    });
}

export function createInputModelFromData(data: {
    packageDirectory: string;
    packageJsonPath: string;
    packageJson: Record<string, unknown>;
    buildConfigPath: string;
    buildConfig: BuildConfig;
    validation: Required<ValidationOptions>;
}): InputModel {
    return data;
}

async function loadPackageJson(path: string): Promise<Record<string, unknown>> {
    if (!existsSync(path)) {
        const dir = dirname(path);
        throw new Error(
            `No package.json found in ${dir}. Does the path point to the correct location?`
        );
    }

    try {
        const content = await readFile(path, "utf-8");
        return JSON.parse(content.toString());
    } catch (e) {
        throw new Error(`Failed to load ${path}`, { cause: e });
    }
}
