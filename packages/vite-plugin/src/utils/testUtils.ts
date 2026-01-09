// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, Logger } from "vite";
import { pioneer, PioneerPluginOptions } from "..";

export const PACKAGE_DIR = resolve(fileURLToPath(import.meta.url), "../../..");
export const TEST_DATA_DIR = resolve(PACKAGE_DIR, "test-data");
export const TEMP_DATA_DIR = resolve(PACKAGE_DIR, "temp");

const PACKAGE_JSON_FILE = resolve(PACKAGE_DIR, "package.json");
if (!existsSync(PACKAGE_JSON_FILE)) {
    throw new Error(`No package.json in current directory. Fix path.`);
}

export async function runViteBuild(options: {
    outDir: string;
    rootDir: string;
    pluginOptions: PioneerPluginOptions;
}) {
    const messages: string[] = [];
    const logger: Logger = {
        info() {},
        warn(msg: string) {
            messages.push(msg);
        },
        error(msg: string) {
            messages.push(msg);
        },
        clearScreen() {},
        hasErrorLogged() {
            return false;
        },
        warnOnce(msg: string) {
            messages.push(msg);
        },
        get hasWarned() {
            return messages.length > 0;
        }
    };

    await build({
        root: options.rootDir,

        build: {
            minify: false,
            outDir: options.outDir,
            emptyOutDir: true,
            rolldownOptions: {
                // Don't log warnings during tests
                onwarn() {
                    void 0;
                },
                external(id, importer, isResolved) {
                    if (isResolved && /[/\\]node_modules[/\\]/.test(id)) {
                        return true;
                    }
                    if (/^@open-pioneer\/runtime\//.test(id)) {
                        return true;
                    }
                }
            }
        },

        css: {
            preprocessorOptions: {
                scss: {
                    silenceDeprecations: ["import"]
                }
            }
        },

        plugins: [
            pioneer(options.pluginOptions),
            {
                name: "force-chunk-names",
                config(_config, _env) {
                    return {
                        build: {
                            rolldownOptions: {
                                output: {
                                    chunkFileNames(_info) {
                                        // Reliable filenames for tests
                                        return "assets/chunk.js";
                                    }
                                }
                            }
                        }
                    };
                }
            }
        ],

        logLevel: "warn",
        customLogger: logger
    });

    if (messages.length > 0) {
        throw new Error(`Unexpected warnings logged by vite:\n` + messages.join("\n"));
    }
}
