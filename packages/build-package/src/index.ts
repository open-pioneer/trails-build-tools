// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { dirname, resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { BUILD_CONFIG_NAME, loadBuildConfig } from "@open-pioneer/build-common";
import { buildPackage } from "./buildPackage";
import type * as API from "..";
import type { BuildOptions } from "..";

type Build = typeof API.build;

export interface HiddenBuildOptions {
    /** Disable warnings. Used for tests. */
    silent?: boolean;
}

export const build: Build = internalBuild;

export async function internalBuild({
    packageDirectory,
    silent
}: BuildOptions & HiddenBuildOptions) {
    const packageJsonPath = resolve(packageDirectory, "package.json");
    const packageJson = loadPackageJson(packageJsonPath);
    const buildConfigPath = resolve(packageDirectory, BUILD_CONFIG_NAME);
    const buildConfig = await loadBuildConfig(buildConfigPath);
    const outputDirectory = resolve(packageDirectory, "dist");
    await buildPackage({
        packageDirectory,
        outputDirectory,
        packageJsonPath,
        packageJson,
        buildConfigPath,
        buildConfig,
        silent,
        clean: true
    });
    return {};
}

function loadPackageJson(path: string): Record<string, unknown> {
    if (!existsSync(path)) {
        throw new Error(
            `No package.json found in ${dirname(
                path
            )}. Does the path point to the correct location?`
        );
    }

    try {
        const content = readFileSync(path, "utf-8");
        return JSON.parse(content.toString());
    } catch (e) {
        throw new Error(`Failed to load ${path}`, { cause: e });
    }
}
