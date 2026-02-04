// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { load as loadYaml } from "js-yaml";
import { readFileSync, existsSync } from "node:fs";

export interface Config {
    skipDevDependencies: boolean;
    rules: ConfigRule[];
}

export interface ConfigRule {
    /** The package name to match. */
    allowedPackageName: string;

    /** True if the rule was used at runtime. */
    matched: boolean;
}

interface RawConfig {
    skipDevDependencies?: boolean | undefined;
    allowed?: string[] | undefined;
}

export function emptyConfig(): Config {
    return {
        skipDevDependencies: false,
        rules: []
    };
}

function readRawConfig(path: string): RawConfig {
    try {
        const content = readFileSync(path, "utf-8");
        const rawConfig = loadYaml(content) as unknown as RawConfig;

        const allowed: string[] | undefined = rawConfig?.allowed;
        const skipDevDependencies: boolean | undefined = rawConfig?.skipDevDependencies;

        if (allowed !== undefined && !Array.isArray(allowed)) {
            throw new Error("Expected 'allowed' to be an array of strings");
        }
        if (skipDevDependencies !== undefined && typeof skipDevDependencies !== "boolean") {
            throw new Error("Expected 'skipDevDependencies' to be a boolean");
        }
        return { allowed, skipDevDependencies };
    } catch (e) {
        throw new Error(`Failed to read config file from ${path}: ${e}`, { cause: e });
    }
}

export function maybeReadRawConfig(path: string): RawConfig {
    if (!existsSync(path)) {
        return {};
    }
    return readRawConfig(path);
}

/**
 * Reads a yaml configuration file from the given path.
 */
export function readConfig(path: string): Config {
    const rawConfig = readRawConfig(path);
    const allowed = rawConfig.allowed ?? [];
    const skipDevDependencies = rawConfig.skipDevDependencies ?? false;
    const config: Config = {
        skipDevDependencies,
        rules: allowed.map((packageName) => {
            return {
                allowedPackageName: packageName,
                matched: false
            };
        })
    };
    return config;
}
