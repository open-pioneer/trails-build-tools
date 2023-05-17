// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import type { BuildOptions, BuildResult } from "../types";
import { existsSync, readFileSync } from "node:fs";
import { BUILD_CONFIG_NAME, loadBuildConfig } from "@open-pioneer/build-common";
import { buildPackage } from "./buildPackage";

export interface HiddenBuildOptions {
    // Disable logs for tests
    silent?: boolean;
}

export async function build({
    packageDirectory,
    silent
}: BuildOptions & HiddenBuildOptions): Promise<BuildResult> {
    const packageJson = loadPackageJson(packageDirectory);
    const buildConfigPath = resolve(packageDirectory, BUILD_CONFIG_NAME);
    const buildConfig = await loadBuildConfig(buildConfigPath);

    const entryPoints = buildConfig.entryPoints;
    if (!entryPoints) {
        throw new Error(
            `${buildConfigPath} must define the 'entryPoints' property in order to be built.`
        );
    }

    const outputDirectory = resolve(packageDirectory, "dist");
    await buildPackage({
        packageDirectory,
        outputDirectory,
        packageJson,
        buildConfig,
        entryPoints,
        silent,
        clean: true
    });
    return {};
}

function loadPackageJson(packageDirectory: string): Record<string, unknown> {
    const packageJsonPath = resolve(packageDirectory, "package.json");
    if (!existsSync(packageJsonPath)) {
        throw new Error(
            `No package.json found in ${packageDirectory}. Does the path point to the correct location?`
        );
    }

    try {
        const content = readFileSync(packageJsonPath, "utf-8");
        return JSON.parse(content.toString());
    } catch (e) {
        throw new Error(`Failed to load ${packageJsonPath}`, { cause: e });
    }
}
