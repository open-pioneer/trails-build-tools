// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { BuildConfig } from "@open-pioneer/build-common";
import { rm } from "fs/promises";
import { SUPPORTED_EXTENSIONS as SUPPORTED_JS_EXTENSIONS, buildJs } from "./buildJs";
import { copyAssets } from "./copyAssets";
import { createDebugger } from "./debug";
import { normalizeEntryPoint, normalizeEntryPoints } from "./helpers";
import { SUPPORTED_EXTENSIONS as SUPPORTED_CSS_EXTENSIONS, buildCss } from "./buildCss";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:build-package");

interface BuildPackageOptions {
    /** Package source directory. */
    packageDirectory: string;

    /** Destination directory. */
    outputDirectory: string;

    /** Parsed package.json */
    packageJson: Record<string, unknown>;

    /** Path to build config file */
    buildConfigPath: string;

    /** Parsed build config file */
    buildConfig: BuildConfig;

    /** True: erase {@link outputDirectory} before building the package. */
    clean: boolean;

    /** Disable warnings. Used for tests. */
    silent?: boolean;
}

export async function buildPackage({
    packageDirectory,
    outputDirectory,
    packageJson,
    buildConfigPath,
    buildConfig,
    silent,
    clean
}: BuildPackageOptions): Promise<void> {
    const packageName = packageJson.name;
    if (typeof packageName !== "string" || !packageName) {
        throw new Error(`Package at ${packageDirectory} does not have a 'name'.`);
    }

    if (clean) {
        isDebug && debug("Clearing output directory %s", outputDirectory);
        await rm(outputDirectory, { recursive: true, force: true });
    }

    // Build JavaScript code
    // TODO: Add services
    const jsEntryPoints = buildConfig.entryPoints;
    if (!jsEntryPoints) {
        throw new Error(
            `${buildConfigPath} must define the 'entryPoints' property in order to be built.`
        );
    }
    if (jsEntryPoints.length > 0) {
        await buildJs({
            packageDirectory,
            outputDirectory,
            entryPoints: normalizeEntryPoints(jsEntryPoints, SUPPORTED_JS_EXTENSIONS),
            packageName,
            sourcemap: false, // TODO
            silent
        });
    }

    // Build styles
    const cssEntryPoint = buildConfig.styles;
    if (cssEntryPoint) {
        await buildCss({
            packageName,
            packageDirectory,
            outputDirectory,
            cssEntryPoint: normalizeEntryPoint(cssEntryPoint, SUPPORTED_CSS_EXTENSIONS),
            sourcemap: false, // TODO
            silent
        });
    }

    // Copy assets
    await copyAssets({
        packageDirectory,
        outputDirectory,
        patterns: buildConfig?.assets ?? ["assets/**"]
    });
}
