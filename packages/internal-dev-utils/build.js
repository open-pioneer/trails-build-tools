// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/no-var-requires */
import esbuild from "esbuild";

const buildOptions = {
    minify: true,
    sourcemap: true,
    tests: false
};

const buildDevOpts = {
    ...buildOptions,
    sourcemap: true,
    tests: true,
    minify: false
};

const watchOpts = {
    ...buildDevOpts,
    watch: true
};

const modes = {
    build: buildOptions,
    buildDev: buildDevOpts,
    watch: watchOpts
};

/**
 * Returns a builder that is configured with default esbuild settings.
 *
 * NOTE: This function works relative to the current working directory,
 * invoke it from the correct package.
 *
 * This is the common build script for packages in this workspace.
 *
 * It expects the following minimal source folder structure:
 *
 * ```plain
 * <package>
 *  |- src/
 *     |- index.ts       # entry point
 * ```
 *
 * @param mode          build / buildDev / watch
 * @param customOptions Custom package options to override defaults.
 *                      Not used yet.
 */
export async function build(mode, customOptions) {
    void customOptions;

    const options = modes[mode];
    if (!options) {
        throw new Error(`Unknown mode: '${mode}'`);
    }

    const { minify, sourcemap, watch } = options;

    /** @type {import("esbuild").BuildOptions} */
    const esbuildOptions = {
        entryPoints: ["./src/index.ts"],
        bundle: true,
        outdir: "dist",
        minify: minify ?? false,
        sourcemap: sourcemap ?? false,
        target: "node16",
        platform: "node",
        packages: "external",
        logLevel: "info",
        format: "cjs"
    };

    if (watch) {
        const context = await esbuild.context(esbuildOptions);
        await context.watch();
    } else {
        await esbuild.build(esbuildOptions);
    }
}
