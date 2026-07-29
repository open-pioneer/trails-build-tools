// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { BuildConfig } from "@open-pioneer/build-support";
import { verifyBuildConfig } from "./verifyBuildConfig";

/**
 * Loads the configuration object exported by the given configuration file.
 *
 * Throws an error if the there is a problem loading the file or if the file does
 * not export a valid build configuration object.
 */
export async function loadBuildConfig(path: string): Promise<BuildConfig> {
    if (!existsSync(path)) {
        throw new Error(`The configuration file at ${path} does not exist`);
    }

    const fileURL = pathToFileURL(path);
    const moduleId = `${fileURL}?ts=${new Date().getTime()}`;
    const importedModule = (await import(moduleId)) as Record<string, unknown>;
    if (!importedModule || !importedModule.default) {
        throw new Error(`The configuration file at ${path} must provide a default export`);
    }

    const config = importedModule.default;
    try {
        return verifyBuildConfig(config);
    } catch (e) {
        throw new Error(`Validation error in configuration file at ${path}`, { cause: e });
    }
}
