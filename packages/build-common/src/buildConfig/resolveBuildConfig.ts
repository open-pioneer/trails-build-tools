// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { join } from "node:path";
import type * as API from "../../types";

type ResolveBuildConfig = typeof API.resolveBuildConfigPath;

/**
 * Base name for build configuration files (without extension).
 */
export const BUILD_CONFIG_BASE_NAME = "build.config";

/**
 * Supported build config file extensions in order of priority.
 * Checks for TypeScript variants first, then JavaScript variants.
 */
export const BUILD_CONFIG_EXTENSIONS = [".mts", ".ts", ".mjs", ".js"] as const;

/**
 * Resolves the path to a build config file in the given directory.
 * Checks for files with supported extensions in priority order.
 *
 * @param packageDir - The directory to search for the build config file
 * @param addWatchFile - Optional callback to register files for watch mode
 * @returns The full path to the config file if found, undefined otherwise
 */
export const resolveBuildConfigPath: ResolveBuildConfig = function resolveBuildConfigPath(
    packageDir,
    addWatchFile
) {
    for (const ext of BUILD_CONFIG_EXTENSIONS) {
        const configPath = join(packageDir, BUILD_CONFIG_BASE_NAME + ext);
        // Register file for watching regardless of existence
        // This ensures watch mode detects when a config file is created
        if (addWatchFile) {
            addWatchFile(configPath);
        }
        if (existsSync(configPath)) {
            return configPath;
        }
    }

    return undefined;
};
