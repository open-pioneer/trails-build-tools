// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { DEFAULT_PACKAGE_TARGET, PackageMetadataV1 } from "@open-pioneer/build-common";
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

    /** Compilation level for trails features. */
    packageFormatTarget: PackageMetadataV1.MinorVersion;
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

    const allEnabled = opts?.validation !== false;
    const validation: ResolvedValidationOptions = {
        requireChangelog: allEnabled,
        requireLicense: allEnabled,
        requireReadme: allEnabled,
        ...(allEnabled ? opts?.validation : undefined)
    };

    let packageFormatTarget: PackageMetadataV1.MinorVersion;
    if (opts?.packageFormatTarget != null) {
        const configuredTarget = opts.packageFormatTarget;
        if (
            !PackageMetadataV1.MINOR_VERSIONS.includes(
                configuredTarget as PackageMetadataV1.MinorVersion
            )
        ) {
            const supportedTargets = PackageMetadataV1.MINOR_VERSIONS.join(", ");
            throw new Error(
                `Configured package format target '${configuredTarget}' is not supported. Supported values are ${supportedTargets}.`
            );
        }

        packageFormatTarget = configuredTarget as PackageMetadataV1.MinorVersion;
    } else {
        packageFormatTarget = DEFAULT_PACKAGE_TARGET;
    }

    return {
        packageDirectory,
        rootDirectory,
        outputDirectory,
        clean,
        strict,
        sourceMaps,
        types,
        validation,
        packageFormatTarget
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
    } catch (_e) {
        return undefined;
    }
}
