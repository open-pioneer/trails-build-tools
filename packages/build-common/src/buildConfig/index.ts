// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import type * as API from "../../types";
export { verifyBuildConfig } from "./verifyBuildConfig";
export { loadBuildConfig } from "./loadBuildConfig";
export { resolveBuildConfigPath, BUILD_CONFIG_EXTENSIONS } from "./resolveBuildConfig";

/**
 * @deprecated Use resolveBuildConfigPath to find config files with any supported extension.
 * This constant is kept for backward compatibility and represents the default .mjs extension.
 */
export const BUILD_CONFIG_NAME: typeof API.BUILD_CONFIG_NAME = "build.config.mjs";
