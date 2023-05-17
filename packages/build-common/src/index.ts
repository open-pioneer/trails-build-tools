// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import type * as API from "..";

export { verifyBuildConfig } from "./verifyBuildConfig";
export { loadBuildConfig } from "./loadBuildConfig";
export const BUILD_CONFIG_NAME: typeof API.BUILD_CONFIG_NAME = "build.config.mjs";
