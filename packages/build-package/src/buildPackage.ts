// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { mkdir, rm, writeFile } from "fs/promises";
import { buildJs } from "./buildJs";
import { copyAssets } from "./copyAssets";
import { createDebugger } from "./utils/debug";
import { buildCss } from "./buildCss";
import { generatePackageJson } from "./generatePackageJson";
import { Logger } from "./utils/Logger";
import { resolve } from "path";
import { InputModel } from "./model/InputModel";
import { createPackageModel } from "./model/PackageModel";
import { ValidationReporter } from "./utils/ValidationReporter";
import { copyAuxiliaryFiles } from "./copyAuxiliaryFiles";
import { copyI18nFiles } from "./copyI18nFiles";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:build-package");

interface BuildPackageOptions {
    /** Input Configuration. */
    input: InputModel;

    /** Destination directory. */
    outputDirectory: string;

    /** True: erase {@link outputDirectory} before building the package. */
    clean: boolean;

    /** True: warnings become fatal. */
    strict: boolean;

    /** True: enable generation of .map files for all supported file types. */
    sourceMaps: boolean;

    logger: Logger;
}

export async function buildPackage({
    outputDirectory,
    input,
    clean,
    strict,
    sourceMaps,
    logger
}: BuildPackageOptions): Promise<void> {
    const model = createPackageModel(input, outputDirectory);
    const reporter = new ValidationReporter(logger, strict);

    // Prepare output directory
    if (clean) {
        isDebug && debug("Clearing output directory %s", outputDirectory);
        await rm(outputDirectory, { recursive: true, force: true });
    }
    await mkdir(outputDirectory, { recursive: true });

    // Compile javascript
    if (model.jsEntryPoints.length) {
        logger.info("Building JavaScript...");
        await buildJs({
            packageDirectory: model.input.packageDirectory,
            outputDirectory: model.outputDirectory,
            entryPoints: model.jsEntryPoints,
            packageName: model.packageName,
            sourceMap: sourceMaps,
            logger
        });
    }

    // Build styles
    if (model.cssEntryPoint) {
        logger.info("Building styles...");
        await buildCss({
            packageName: model.packageName,
            packageDirectory: model.input.packageDirectory,
            outputDirectory,
            cssEntryPoint: model.cssEntryPoint,
            sourceMap: sourceMaps,
            logger
        });
    }

    // Copy i18n
    if (model.i18nFiles.size) {
        logger.info("Copying i18n files...");
        await copyI18nFiles({
            packageDirectory: model.input.packageDirectory,
            outputDirectory: model.outputDirectory,
            files: model.i18nFiles
        });
    }

    // Copy assets
    if (model.assetPatterns.length) {
        logger.info("Copying assets...");
        await copyAssets({
            packageDirectory: model.input.packageDirectory,
            outputDirectory: model.outputDirectory,
            patterns: model.assetPatterns
        });
    }

    // Write package.json
    logger.info("Writing package metadata...");
    const packageJsonContent = await generatePackageJson({
        model,
        logger,
        reporter
    });
    await writeFile(
        resolve(outputDirectory, "package.json"),
        JSON.stringify(packageJsonContent, undefined, 4),
        "utf-8"
    );

    // Write license files etc.
    logger.info("Copying auxiliary files...");
    await copyAuxiliaryFiles({
        packageDirectory: model.input.packageDirectory,
        outputDirectory: model.outputDirectory,
        validation: model.input.validation,
        reporter
    });

    reporter.finish();
}
