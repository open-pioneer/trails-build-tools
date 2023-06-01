// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { copy } from "fs-extra";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createDebugger } from "./utils/debug";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:copy-i18n-files");

export interface CopyI18nFilesOptions {
    /** Package source directory. */
    packageDirectory: string;

    /** Destination directory. */
    outputDirectory: string;

    /** The files to copy, relative to the package directory. */
    files: Set<string>;
}

/** Copies the given files to the the output directory. */
export async function copyI18nFiles({
    packageDirectory,
    outputDirectory,
    files
}: CopyI18nFilesOptions): Promise<void> {
    for (const file of files) {
        isDebug && debug(`Attempting to copy '${file}'`);

        const absoluteSourcePath = resolve(packageDirectory, file);
        if (!existsSync(absoluteSourcePath)) {
            throw new Error(`I18n file does not exist: ${absoluteSourcePath}`);
        }
        const absoluteTargetPath = resolve(outputDirectory, file);
        await copy(absoluteSourcePath, absoluteTargetPath);
    }
}
