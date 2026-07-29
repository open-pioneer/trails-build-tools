// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import type { MinorVersion } from "../packageMetadata/v1";

export { verifyBuildConfig } from "./verifyBuildConfig";
export { loadBuildConfig } from "./loadBuildConfig";

/**
 * The name of the build config file expected in an Open Pioneer Trails page.
 *
 * This is currently always `build.config.mjs`.
 */
export const BUILD_CONFIG_NAME: string = "build.config.mjs";

/**
 * The default package format target used when compiling trails packages.
 */
export const DEFAULT_PACKAGE_TARGET: MinorVersion = "1.0" as MinorVersion;
