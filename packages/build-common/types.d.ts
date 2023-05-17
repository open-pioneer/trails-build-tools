// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { BuildConfig } from "@open-pioneer/build-support";

/**
 * The name of the build config file expected in a pioneer page.
 *
 * This is currently always `build.config.mjs`.
 */
export const BUILD_CONFIG_NAME: string;

/**
 * Ensures that `value` conforms to the {@link BuildConfig} interface.
 * Throws an error if that is not the case.
 *
 * @returns `value` but casted to the appropriate type.
 */
export function verifyBuildConfig(value: unknown): BuildConfig;

/**
 * Loads the configuration object exported by the given configuration file.
 *
 * Throws an error if the there is a problem loading the file or if the file does
 * not export a valid build configuration object.
 */
export async function loadBuildConfig(path: string): Promise<BuildConfig>;
