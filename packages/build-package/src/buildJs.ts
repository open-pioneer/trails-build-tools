// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import { resolvePlugin } from "./rollup/resolve";

const SUPPORTED_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

export interface BuildJSOptions {
    packageDirectory: string;
    outputDirectory: string;
    entryPoints: string[];
    sourcemap: boolean;

    /** Disable warnings. Used for tests. */
    silent?: boolean;
}

export async function buildJS({
    packageDirectory,
    outputDirectory,
    entryPoints,
    sourcemap,
    silent
}: BuildJSOptions) {
    // Ensure entry points start with "./".
    // Relative imports are handled by the resolveExtensions plugin, but paths
    // that look like absolute ids are skipped.
    const relativeEntryPoints = entryPoints.map((e) => {
        if (e.startsWith("./")) {
            return e;
        }
        return `./${e}`;
    });
    const result = await rollup({
        input: relativeEntryPoints,
        plugins: [
            resolvePlugin({
                packageDirectory,
                allowedExtensions: SUPPORTED_EXTENSIONS
            }),
            esbuild({
                jsx: "automatic",
                jsxDev: false,
                target: "es2020"
            })
        ],
        onwarn: silent ? () => undefined : undefined
    });
    await result.write({
        preserveModules: true,
        dir: resolve(outputDirectory),
        minifyInternalExports: false,
        compact: false,
        format: "es",
        sourcemap: sourcemap
        // TODO
        // sourcemapPathTransform
    });
}
