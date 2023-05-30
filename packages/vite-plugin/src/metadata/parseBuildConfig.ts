// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import {
    BUILD_CONFIG_NAME,
    PackageConfig,
    createPackageConfigFromBuildConfig,
    loadBuildConfig as loadBuildConfigCommon,
    verifyBuildConfig
} from "@open-pioneer/build-common";
import { basename } from "node:path";

/**
 * Loads and parses a build configuration file from the given path on disk.
 */
export async function loadBuildConfig(path: string): Promise<PackageConfig> {
    const rawConfig = await loadBuildConfigCommon(path);
    return createPackageConfigFromBuildConfig(rawConfig);
}

/**
 * Parses a build configuration object and validates it.
 */
export function parseBuildConfig(object: unknown): PackageConfig {
    const rawConfig = verifyBuildConfig(object);
    return createPackageConfigFromBuildConfig(rawConfig);
}

export function isBuildConfig(file: string) {
    return basename(file) === BUILD_CONFIG_NAME;
}
