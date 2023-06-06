// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { copy } from "fs-extra";
import { lstatSync } from "node:fs";
import { relative, resolve } from "node:path";
import { ResolvedValidationOptions } from "./model/Options";
import { ValidationReporter } from "./utils/ValidationReporter";
import { createDebugger } from "./utils/debug";
import { resolveFirstMatchWithExtensions } from "./utils/resolve";

export interface CopyAuxiliaryFilesOptions {
    /** Package source directory. */
    packageDirectory: string;

    /** Output directory. */
    outputDirectory: string;

    /** Validation options. */
    validation: ResolvedValidationOptions;

    reporter: ValidationReporter;
}

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:copy-auxiliary-files");

const TEXT_EXTENSIONS = [".md", ".txt"];

export async function copyAuxiliaryFiles({
    packageDirectory,
    outputDirectory,
    validation,
    reporter
}: CopyAuxiliaryFilesOptions) {
    const copyTextFile = async (name: string, required = false) => {
        isDebug && debug(`Attempting to copy '${name}'`);

        const sourcePath = resolveFirstMatchWithExtensions(
            resolve(packageDirectory, name),
            TEXT_EXTENSIONS
        );
        if (!sourcePath) {
            if (required) {
                const exts = TEXT_EXTENSIONS.join(", ");
                reporter.report(
                    `Failed to find ${name} in ${packageDirectory} (attempted exact match and extensions ${exts}).`
                );
            } else {
                isDebug && debug(`No ${name} in ${packageDirectory}`);
            }
            return;
        }
        if (!isFile(sourcePath)) {
            throw new Error(`Expected ${sourcePath} to be a regular file`);
        }

        const targetPath = resolve(outputDirectory, relative(packageDirectory, sourcePath));
        await copy(sourcePath, targetPath);
    };

    await copyTextFile("LICENSE", validation.requireLicense);
    await copyTextFile("NOTICE");
    await copyTextFile("README", validation.requireReadme);
    await copyTextFile("CHANGELOG", validation.requireChangelog);
}

function isFile(path: string) {
    return lstatSync(path).isFile();
}
