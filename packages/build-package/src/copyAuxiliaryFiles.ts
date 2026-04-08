// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { copy } from "fs-extra";
import { existsSync, lstatSync } from "node:fs";
import { basename, isAbsolute, parse, relative, resolve } from "node:path";
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

    /** Custom paths for certain files. */
    fileOverrides?: {
        license?: string | undefined;
        notice?: string | undefined;
    };

    reporter: ValidationReporter;
}

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:copy-auxiliary-files");

const TEXT_EXTENSIONS = [".md", ".txt"];

export async function copyAuxiliaryFiles({
    packageDirectory,
    outputDirectory,
    validation,
    fileOverrides,
    reporter
}: CopyAuxiliaryFilesOptions) {
    const copyTextFile = async (name: string, required = false, override?: string | undefined) => {
        isDebug && debug(`Attempting to copy '${name}'`);

        const result = override
            ? findOverride(packageDirectory, name, override)
            : findTextFile(packageDirectory, name, reporter, required);
        if (!result) {
            return;
        }

        const { sourcePath, target } = result;
        if (!isFile(sourcePath)) {
            throw new Error(`Expected ${sourcePath} to be a regular file`);
        }

        if (isAbsolute(target)) {
            throw new Error("Internal error: target path must be relative");
        }

        const targetPath = resolve(outputDirectory, target);
        await copy(sourcePath, targetPath);
    };

    await copyTextFile("LICENSE", validation.requireLicense, fileOverrides?.license);
    await copyTextFile("NOTICE", false, fileOverrides?.notice);
    await copyTextFile("README", validation.requireReadme);
    await copyTextFile("CHANGELOG", validation.requireChangelog);
}

function findOverride(packageDirectory: string, name: string, override: string) {
    const sourcePath = resolve(packageDirectory, override);
    isDebug && debug(`Using '${sourcePath}' as override for ${name}`);

    if (!existsSync(sourcePath)) {
        throw new Error(`File '${override}' does not exist (configured as ${name})`);
    }

    const filename = basename(override);
    if (parse(filename).name !== name) {
        throw new Error(
            `File '${override}' should have basename ${name} (with any file extension)`
        );
    }

    return {
        sourcePath,
        target: filename
    };
}

function findTextFile(
    packageDirectory: string,
    name: string,
    reporter: ValidationReporter,
    required: boolean
): { sourcePath: string; target: string } | undefined {
    isDebug && debug(`Looking for ${name} in ${packageDirectory}`);
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
        return undefined;
    }

    const target = relative(packageDirectory, sourcePath);
    return { sourcePath, target };
}

function isFile(path: string) {
    return lstatSync(path).isFile();
}
