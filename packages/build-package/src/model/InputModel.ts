// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import {
    BUILD_CONFIG_NAME,
    BuildConfig,
    PackageConfig,
    createPackageConfigFromBuildConfig,
    loadBuildConfig,
    resolveBuildConfigPath
} from "@open-pioneer/build-common";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

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

    /** Normalized package info from build.config. */
    packageConfig: PackageConfig;
}

export async function createInputModel(packageDirectory: string): Promise<InputModel> {
    packageDirectory = resolve(packageDirectory); // ensure we use absolute path
    if (!existsSync(packageDirectory)) {
        throw new Error(`Package directory ${packageDirectory} does not exist.`);
    }

    const packageJsonPath = resolve(packageDirectory, "package.json");
    const packageJson = await loadPackageJson(packageJsonPath);
    const buildConfigPath = resolveBuildConfigPath(packageDirectory);
    if (!buildConfigPath) {
        throw new Error(`No build config file found in ${packageDirectory}`);
    }
    const buildConfig = await loadBuildConfig(buildConfigPath);
    return createInputModelFromData({
        packageDirectory,
        packageJsonPath,
        packageJson,
        buildConfigPath,
        buildConfig
    });
}

export function createInputModelFromData(data: {
    packageDirectory: string;
    packageJsonPath: string;
    packageJson: Record<string, unknown>;
    buildConfigPath: string;
    buildConfig: BuildConfig;
}): InputModel {
    return {
        ...data,
        packageConfig: createPackageConfigFromBuildConfig(data.buildConfig)
    };
}

export async function loadPackageJson(path: string): Promise<Record<string, unknown>> {
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
