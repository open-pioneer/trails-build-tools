// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import type * as API from "../../types";
export { verifyBuildConfig } from "./verifyBuildConfig";
export { loadBuildConfig } from "./loadBuildConfig";
export { isRuntimeVersion } from "./isRuntimeVersion";
export const BUILD_CONFIG_NAME: typeof API.BUILD_CONFIG_NAME = "build.config.mjs";
export const RUNTIME_BASE_VERSION: typeof API.RUNTIME_BASE_VERSION = "1.0.0";
