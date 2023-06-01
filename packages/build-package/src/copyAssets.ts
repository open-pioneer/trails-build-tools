// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import glob from "fast-glob";
import { resolve } from "node:path";
import { copy } from "fs-extra";
import { createDebugger } from "./utils/debug";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:copy-assets");

export interface CopyAssetsOptions {
    /**
     * Package source directory.
     * Patterns are interpreted relative to this directory.
     */
    packageDirectory: string;

    /**
     * Output directory.
     * Files will be copied here.
     */
    outputDirectory: string;

    /**
     * Patterns for glob matching in the source directory.
     */
    patterns: string[];
}

/**
 * Copies the files specified by the given patterns from `packageDirectory` to `outputDirectory`.
 */
export async function copyAssets({
    packageDirectory,
    outputDirectory,
    patterns
}: CopyAssetsOptions): Promise<void> {
    const files = await glob(patterns, {
        cwd: packageDirectory,
        dot: false,
        ignore: ["**/node_modules/**"],
        unique: true,
        onlyFiles: true
    });

    const copySingleFile = async (name: string) => {
        const absoluteSrc = resolve(packageDirectory, name);
        const absoluteDst = resolve(outputDirectory, name);
        try {
            isDebug && debug("Copying asset %s to %s", absoluteSrc, absoluteDst);
            await copy(absoluteSrc, absoluteDst);
        } catch (e) {
            throw new Error(`Failed to copy asset '${name}' to ${absoluteDst}`, { cause: e });
        }
    };

    await Promise.all(files.map(copySingleFile));
}
