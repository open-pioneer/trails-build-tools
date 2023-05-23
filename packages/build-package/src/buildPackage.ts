// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { BuildConfig } from "@open-pioneer/build-common";
import { mkdir, rm, writeFile } from "fs/promises";
import { SUPPORTED_EXTENSIONS as SUPPORTED_JS_EXTENSIONS, buildJs } from "./buildJs";
import { copyAssets } from "./copyAssets";
import { createDebugger } from "./debug";
import { normalizeEntryPoint, normalizeEntryPoints } from "./helpers";
import { SUPPORTED_EXTENSIONS as SUPPORTED_CSS_EXTENSIONS, buildCss } from "./buildCss";
import { generatePackageJson } from "./generatePackageJson";
import { createConsoleLogger } from "./Logger";
import { resolve } from "path";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:build-package");

interface BuildPackageOptions {
    /** Package source directory. */
    packageDirectory: string;

    /** Destination directory. */
    outputDirectory: string;

    /** Path to package.json. */
    packageJsonPath: string;

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
    packageJsonPath,
    packageJson,
    buildConfigPath,
    buildConfig,
    silent,
    clean
}: BuildPackageOptions): Promise<void> {
    const logger = createConsoleLogger(); // TODO: From caller

    const packageName = packageJson.name;
    if (typeof packageName !== "string" || !packageName) {
        throw new Error(`Package at ${packageDirectory} does not have a 'name'.`);
    }

    if (clean) {
        isDebug && debug("Clearing output directory %s", outputDirectory);
        await rm(outputDirectory, { recursive: true, force: true });
    }
    await mkdir(outputDirectory, { recursive: true });

    // Build JavaScript code
    // TODO: Add services
    const jsEntryPoints = buildConfig.entryPoints;
    if (!jsEntryPoints) {
        throw new Error(
            `${buildConfigPath} must define the 'entryPoints' property in order to be built.`
        );
    }

    const normalizedJsEntryPoints = normalizeEntryPoints(jsEntryPoints, SUPPORTED_JS_EXTENSIONS);
    if (jsEntryPoints.length > 0) {
        await buildJs({
            packageDirectory,
            outputDirectory,
            entryPoints: normalizedJsEntryPoints,
            packageName,
            sourceMap: false, // TODO
            silent
        });
    }

    // Build styles
    const normalizedCssEntryPoint = buildConfig.styles
        ? normalizeEntryPoint(buildConfig.styles, SUPPORTED_CSS_EXTENSIONS)
        : undefined;
    if (normalizedCssEntryPoint) {
        await buildCss({
            packageName,
            packageDirectory,
            outputDirectory,
            cssEntryPoint: normalizedCssEntryPoint,
            sourceMap: false, // TODO
            silent
        });
    }

    // Copy assets
    await copyAssets({
        packageDirectory,
        outputDirectory,
        patterns: toArray(buildConfig.publishConfig?.assets ?? "assets/**")
    });

    const packageJsonContent = await generatePackageJson({
        sourcePackageJsonPath: packageJsonPath,
        sourcePackageJson: packageJson,
        buildConfigPath,
        buildConfig,
        jsEntryPoints: normalizedJsEntryPoints,
        cssEntryPoint: normalizedCssEntryPoint,
        logger,
        strict: true //TODO
    });

    await writeFile(
        resolve(outputDirectory, "package.json"),
        JSON.stringify(packageJsonContent, undefined, 4),
        "utf-8"
    );
}

function toArray<T>(value: T | T[]): T[] {
    if (Array.isArray(value)) {
        return value;
    }
    return [value];
}
