// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { statSync } from "node:fs";
import { relative, resolve } from "node:path";
import {
    DependencyPublicAssetConfig,
    LocalPublicAssetConfig,
    PackageMetadataV1,
    PublicAssetConfig
} from "@open-pioneer/build-common";
import { normalizePath } from "@rollup/pluginutils";
import { isDeclaredDependency, parsePackageName } from "../utils/dependencies";
import { isInDirectory } from "../utils/pathUtils";
import { InputModel } from "./InputModel";

/**
 * Classifies each public asset directory of the build config as a directory of the package itself
 * or as a directory of a dependency. The entries keep the order of the build config.
 *
 * Throws if a published package cannot carry one of the directories.
 */
export function resolvePublicAssets(
    input: InputModel,
    outputDirectory: string,
    packageFormatTarget: PackageMetadataV1.MinorVersion
): PublicAssetConfig[] {
    const entries = input.packageConfig.publicAssets;
    if (!entries.length) {
        return [];
    }

    const support = PackageMetadataV1.supportsFeature(packageFormatTarget, "public-assets");
    if (!support.supports) {
        throw new Error(
            `Public assets require package format target '${support.needed}' or later.`
        );
    }

    return entries.map((entry) => resolvePublicAsset(entry, input, outputDirectory));
}

function resolvePublicAsset(
    entry: PublicAssetConfig,
    input: InputModel,
    outputDirectory: string
): PublicAssetConfig {
    if (entry.type !== "local") {
        throw new Error("Internal error: a build config can only declare local public assets.");
    }

    const { src, dest } = entry;

    // Happens to work for ./node_modules too, since that is inside the package directory as well.
    const resolvedSrc = resolve(input.packageDirectory, src);
    if (!isInDirectory(resolvedSrc, input.packageDirectory)) {
        throw new Error(
            `Public asset directory '${src}' is outside the package. A published package may only use public assets from itself or from a dependency.`
        );
    }

    const relativeSrc = normalizePath(relative(input.packageDirectory, resolvedSrc));
    const segments = relativeSrc.split("/");
    if (segments.lastIndexOf("node_modules") > 0) {
        throw new Error(
            `Public asset directory '${src}' may only use 'node_modules' as the first directory of its path.`
        );
    }
    checkDirectory(src, resolvedSrc);

    if (segments[0] === "node_modules") {
        return resolveDependencyPublicAsset(entry, segments.slice(1).join("/"), input);
    }

    if (
        isInDirectory(outputDirectory, resolvedSrc, true) ||
        isInDirectory(resolvedSrc, outputDirectory)
    ) {
        throw new Error(`Public asset directory '${src}' must not overlap the output directory.`);
    }
    // Relative also when the build config uses an absolute path.
    return { type: "local", src: relativeSrc, dest };
}

function resolveDependencyPublicAsset(
    { src, dest }: LocalPublicAssetConfig,
    pathInNodeModules: string,
    input: InputModel
): DependencyPublicAssetConfig {
    const packageName = parsePackageName(pathInNodeModules);
    if (!packageName) {
        throw new Error(
            `Public asset directory '${src}' does not name a package after 'node_modules'.`
        );
    }
    if (!isDeclaredDependency(packageName, input.packageJson)) {
        throw new Error(
            `Public asset directory '${src}' belongs to the package '${packageName}', which must be listed in the 'dependencies' or 'peerDependencies' of ${input.packageJsonPath}.`
        );
    }
    return {
        type: "dependency",
        packageName,
        src: pathInNodeModules.slice(packageName.length + 1),
        dest
    };
}

function checkDirectory(src: string, directory: string) {
    const stats = statSync(directory, { throwIfNoEntry: false });
    if (!stats) {
        throw new Error(`Public asset directory '${src}' does not exist.`);
    }
    if (!stats.isDirectory()) {
        throw new Error(`Public asset directory '${src}' is not a directory.`);
    }
}
