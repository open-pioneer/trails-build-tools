// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { load as loadYaml } from "js-yaml";
import { readFileSync } from "node:fs";

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

/**
 * Reads a yaml configuration file from the given path.
 */
export function readConfig(path: string): Config {
    try {
        const content = readFileSync(path, "utf-8");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawConfig = loadYaml(content) as unknown as RawConfig;

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
    } catch (e) {
        throw new Error(`Failed to read config file from ${path}: ${e}`, { cause: e });
    }
}
