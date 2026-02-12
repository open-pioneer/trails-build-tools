// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { verifyBuildConfig } from "./verifyBuildConfig";
import { existsSync } from "node:fs";
import { createJiti } from "jiti";
import type * as API from "../../types";

type LoadBuildConfig = typeof API.loadBuildConfig;

// Shared jiti instance for better performance
let jitiInstance: ReturnType<typeof createJiti> | undefined;

function getJitiInstance(): ReturnType<typeof createJiti> {
    if (!jitiInstance) {
        jitiInstance = createJiti(__filename, {
            interopDefault: false,
            moduleCache: false,
            requireCache: false,
            // Enable filesystem caching for better performance
            fsCache: true
        });
    }
    return jitiInstance;
}

export const loadBuildConfig: LoadBuildConfig = async function loadBuildConfig(path) {
    if (!existsSync(path)) {
        throw new Error(`The configuration file at ${path} does not exist`);
    }

    let config: unknown;

    try {
        // Use jiti for all file types (TypeScript and JavaScript)
        // jiti will handle both efficiently and provide consistent behavior
        const jiti = getJitiInstance();
        // Import the module and extract the default export
        const imported = (await jiti.import(path)) as { default?: unknown };
        config = imported?.default;
    } catch (e) {
        throw new Error(`Failed to load configuration file at ${path}`, { cause: e });
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
