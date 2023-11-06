// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/no-var-requires */
import esbuild from "esbuild";

/*
    This file contains the common build script used when building a 
    package in this repository for npm.
*/

const buildOptions = {
    minify: false,
    sourceMap: true
};

const buildDevOpts = {
    ...buildOptions,
    sourceMap: true,
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

    const { minify, sourceMap, watch } = options;

    /** @type {import("esbuild").BuildOptions} */
    const esbuildOptions = {
        entryPoints: ["./src/index.ts"],
        bundle: true,
        outdir: "dist",
        minify: minify ?? false,
        sourcemap: sourceMap ?? false,
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
