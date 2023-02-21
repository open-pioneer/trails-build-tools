// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import { build } from "vite";
import { pioneer, PioneerPluginOptions } from "..";

// Assumes cwd is package dir
export const TEST_DATA = resolve("./test-data");
export const TEMP_DATA = resolve("./temp");

export const GENERATE_SNAPSHOTS = process.env.SNAPSHOTS === "1";

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
