// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import { build } from "vite";
import { pioneer, PioneerPluginOptions } from "..";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

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
    await build({
        root: options.rootDir,

        build: {
            minify: false,
            outDir: options.outDir,
            emptyOutDir: true,
            rollupOptions: {
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

        plugins: [pioneer(options.pluginOptions)],

        logLevel: "silent"
    });
}
