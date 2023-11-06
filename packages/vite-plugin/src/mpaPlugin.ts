// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { Plugin, ResolvedConfig } from "vite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { posix } from "node:path";
import { cwd } from "node:process";
import { type PioneerPluginOptions } from ".";
import { RollupOptions } from "rollup";
import { AdvancedAppOptions } from "../types";

export function mpaPlugin(options: PioneerPluginOptions | undefined): Plugin {
    const rootSite = options?.rootSite ?? false;
    const apps = options?.apps || [];
    const sites = options?.sites || [];

    let resolvedConfig: ResolvedConfig;
    return {
        name: "pioneer:mpa",

        config(config) {
            const sourceRoot = config.root ?? cwd();
            const { entryPoints, appNames } = gatherEntryPoints({
                apps,
                sites,
                rootSite,
                sourceRoot
            });
            const rollupOptions: RollupOptions = {
                input: entryPoints,
                output: {
                    entryFileNames(chunk) {
                        if (appNames.includes(chunk.name)) {
                            return "[name].js";
                        }

                        // This will rename the .js files that belong to a .html site, they don't need a public name.
                        return posix.join(resolvedConfig.build.assetsDir, "[hash:12].js");
                    },
                    chunkFileNames(chunk) {
                        void chunk; // ignored
                        return posix.join(resolvedConfig.build.assetsDir, "[hash:12].js");
                    }
                }
            };

            return {
                build: {
                    rollupOptions
                }
            };
        },

        configResolved(config) {
            resolvedConfig = config;
        }
    };
}

export interface EntryPointInfo {
    // Parsed rollup entry points
    entryPoints: Record<string, string>;

    // All app names used by the project
    appNames: string[];
}

function gatherEntryPoints(options: {
    apps: string[] | AdvancedAppOptions;
    sites: string[];
    rootSite: boolean;
    sourceRoot: string;
}): EntryPointInfo {
    interface RawEntryPoint {
        name: string;
        path: string;
    }

    let apps: RawEntryPoint[];
    if (Array.isArray(options.apps)) {
        apps = options.apps.map((appName) => {
            const prefix = resolve(options.sourceRoot, "apps", appName, "app");
            const path = findMatchingEntryPointFile(appName, prefix);
            return {
                name: appName,
                path: path
            };
        });
    } else {
        apps = Object.entries(options.apps).map(([name, appPath]) => {
            const path = resolve(options.sourceRoot, appPath);
            if (!existsSync(path)) {
                throw new Error(
                    `Failed to find app '${name}' at ${path}. Ensure that the path is spelled correctly.`
                );
            }
            return { name, path };
        });
    }

    /*
     * Vite does not respect the entry point name for html files, it
     * put each html site at a location mirroring the source directory structure (e.g. site/<SITE>/index.html
     * instead of SITE.html).
     *
     * There are multiple vite mpa plugins that handle custom html paths which can either be used
     * directly or as inspiration.
     */
    const sites = options.sites.map((sitePath) => {
        const path = resolve(options.sourceRoot, sitePath, "index.html");
        if (!existsSync(path)) {
            throw new Error(
                `Failed to find site at ${path}. Ensure that the site name in your vite configuration is spelled correctly.`
            );
        }
        return {
            name: sitePath,
            path: path
        };
    });
    if (options.rootSite) {
        const path = resolve(options.sourceRoot, "index.html");
        if (!existsSync(path)) {
            throw new Error(
                `Failed to find root site at ${path}. Create the missing file or set 'rootSite' to false.`
            );
        }
        sites.push({
            name: "index",
            path: path
        });
    }

    const entryPoints: Record<string, string> = {};
    let entryPointCount = 0;
    for (const { name, path } of [apps, sites].flat()) {
        const existingPath = entryPoints[name];
        if (existingPath) {
            throw new Error(
                `Entry point '${name}' was defined twice (paths ${existingPath} and ${path}). Remove the duplicated entry.`
            );
        }
        entryPoints[name] = path;
        ++entryPointCount;
    }
    if (entryPointCount === 0) {
        throw new Error(
            "You must configure at least one site or one app in the pioneer plugin options."
        );
    }

    const appNames = apps.map(({ name }) => name);
    return {
        entryPoints,
        appNames
    };
}

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

function findMatchingEntryPointFile(appName: string, prefix: string) {
    for (const ext of EXTENSIONS) {
        const candidate = prefix + ext;
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    const extensions = EXTENSIONS.join(", ");
    throw new Error(
        `Failed to find a matching entry point file for app '${appName}' at ${prefix}.` +
            ` Supported extensions are ${extensions}.` +
            ` Ensure that the app name is spelled correctly or create the missing file.`
    );
}
