// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import type * as API from "../../types";
export { verifyBuildConfig } from "./verifyBuildConfig";
export { loadBuildConfig } from "./loadBuildConfig";
export { isRuntimeVersion } from "./isRuntimeVersion";
export const BUILD_CONFIG_NAME: typeof API.BUILD_CONFIG_NAME = "build.config.mjs";
export const MIN_SUPPORTED_RUNTIME_VERSION: typeof API.MIN_SUPPORTED_RUNTIME_VERSION = "1.0.0";
export const CURRENT_RUNTIME_VERSION: typeof API.CURRENT_RUNTIME_VERSION = "1.1.0";
export const RUNTIME_VERSIONS: typeof API.RUNTIME_VERSIONS = ["1.0.0", "1.1.0"];
export {canParse} from "../packageMetadata/versionUtils";
