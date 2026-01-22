// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { pathToFileURL } from "node:url";
import { verifyBuildConfig } from "./verifyBuildConfig";
import { existsSync } from "node:fs";
import { createJiti } from "jiti";
import type * as API from "../../types";

type LoadBuildConfig = typeof API.loadBuildConfig;

/**
 * Checks if a file is a TypeScript file based on its extension.
 */
function isTypeScriptFile(path: string): boolean {
    return path.endsWith(".ts") || path.endsWith(".mts") || path.endsWith(".cts");
}

export const loadBuildConfig: LoadBuildConfig = async function loadBuildConfig(path) {
    if (!existsSync(path)) {
        throw new Error(`The configuration file at ${path} does not exist`);
    }

    let config: unknown;

    // Use jiti for TypeScript files, dynamic import for JavaScript files
    if (isTypeScriptFile(path)) {
        // Create a jiti instance for loading TypeScript files
        // Use the config file directory as the base for jiti
        const jiti = createJiti(__filename, {
            interopDefault: true,
            moduleCache: false,
            requireCache: false
        });

        try {
            const loaded = jiti(path);
            // jiti with interopDefault: true should return the default export directly
            // but we need to handle the case where it might still be wrapped
            config = loaded?.default ?? loaded;
        } catch (e) {
            throw new Error(`Failed to load configuration file at ${path}`, { cause: e });
        }
    } else {
        // For JavaScript files, use the original dynamic import approach
        const fileURL = pathToFileURL(path);
        const moduleId = `${fileURL}?ts=${new Date().getTime()}`;
        const importedModule = (await import(moduleId)) as Record<string, unknown>;
        if (!importedModule || !importedModule.default) {
            throw new Error(`The configuration file at ${path} must provide a default export`);
        }
        config = importedModule.default;
    }

    if (!config) {
        throw new Error(`The configuration file at ${path} must provide a default export`);
    }

    try {
        return await verifyBuildConfig(config);
    } catch (e) {
        throw new Error(`Validation error in configuration file at ${path}`, { cause: e });
    }
};
