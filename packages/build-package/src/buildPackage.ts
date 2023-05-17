// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { BuildConfig } from "@open-pioneer/build-common";
import { createDebugger } from "./debug";
import { rm } from "fs/promises";
import { SUPPORTED_EXTENSIONS, buildJs } from "./buildJs";
import { normalizeEntryPoints } from "./helpers";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:build-package");

interface BuildPackageOptions {
    packageDirectory: string;
    outputDirectory: string;
    packageJson: Record<string, unknown>;
    buildConfig: BuildConfig;
    entryPoints: string[];
    clean: boolean;
    silent?: boolean;
}

export async function buildPackage({
    packageDirectory,
    outputDirectory,
    packageJson,
    buildConfig,
    entryPoints,
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

    await buildJs({
        packageDirectory,
        outputDirectory,
        entryPoints: normalizeEntryPoints(entryPoints, SUPPORTED_EXTENSIONS),
        packageName,
        sourcemap: false, // TODO
        silent
    });
}
