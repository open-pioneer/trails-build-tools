// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { PublishConfig, ValidationOptions } from "@open-pioneer/build-support";
import findGitRoot from "find-git-root";
import findWorkspaces from "find-workspaces";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { shouldGenerateTypes } from "../buildDts";
import { createDebugger } from "../utils/debug";
import { isInDirectory } from "../utils/pathUtils";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:options");

export interface ResolvedOptions {
    /** Package source directory. */
    packageDirectory: string;

    /** Root directory shared with other packages. */
    rootDirectory: string;

    /** Destination directory. */
    outputDirectory: string;

    /** True: erase {@link outputDirectory} before building the package. */
    clean: boolean;

    /** True: warnings become fatal. */
    strict: boolean;

    /** True: enable generation of .map files for all supported file types. */
    sourceMaps: boolean;

    /** True: Enable generation of .d.ts files */
    types: boolean;

    /** Validation options during the build. */
    validation: Required<ValidationOptions>;
}

export type ResolvedValidationOptions = Required<ValidationOptions>;

export async function resolveOptions(
    packageDirectory: string,
    rootDirectory: string | undefined,
    opts: PublishConfig | undefined
): Promise<ResolvedOptions> {
    packageDirectory = resolve(packageDirectory);
    if (!existsSync(packageDirectory)) {
        throw new Error(`Package directory ${packageDirectory} does not exist.`);
    }

    rootDirectory ??= detectRoot(packageDirectory);
    if (!rootDirectory) {
        throw new Error(
            `Could not detect root directory for package ${packageDirectory}. ` +
                `Please provide a root directory or run in a workspace / git repository.`
        );
    }

    rootDirectory = resolve(rootDirectory);
    isDebug && debug("Resolved root directory to %s", rootDirectory);
    if (!existsSync(rootDirectory)) {
        throw new Error(`Root directory ${rootDirectory} does not exist.`);
    }
    if (!isInDirectory(packageDirectory, rootDirectory, true)) {
        throw new Error(
            `Package directory ${packageDirectory} must be a child of root directory ${rootDirectory}.`
        );
    }

    const outputDirectory = join(packageDirectory, "dist");
    const clean = true;
    const strict = opts?.strict ?? true;
    const sourceMaps = opts?.sourceMaps ?? true;
    const types = await shouldGenerateTypes(packageDirectory, opts?.types);
    const validation: ResolvedValidationOptions = {
        requireReadme: true,
        requireLicense: true,
        requireChangelog: true,
        ...opts?.validation
    };
    return {
        packageDirectory,
        rootDirectory,
        outputDirectory,
        clean,
        strict,
        sourceMaps,
        types,
        validation
    };
}

function detectRoot(packageDirectory: string): string | undefined {
    const workspaceRoot = findWorkspaces.findWorkspacesRoot(packageDirectory);
    if (workspaceRoot) {
        isDebug && debug("Detected workspace root at %s", workspaceRoot.location);
        return workspaceRoot.location;
    }

    try {
        const gitRoot = dirname(findGitRoot(packageDirectory));
        isDebug && debug("Detected git repository at %s", gitRoot);
        return gitRoot;
    } catch (e) {
        return undefined;
    }
}
