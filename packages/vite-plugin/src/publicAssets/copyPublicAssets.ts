// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { join } from "node:path";
import { AnalyzedPackage } from "../metadata/Metadata";
import { PACKAGE_ASSETS_DIR } from "./constants";
import { copyDirectory } from "./copyDirectory";
import { packageNameToSlug } from "./packageSlug";

export interface CopyPublicAssetsOptions {
    /** The Trails packages of all apps in the build. */
    packages: AnalyzedPackage[];

    /** The output directory of the build. */
    outDir: string;
}

/**
 * Copies the public assets of `packages` to `<outDir>/packages/<packageSlug>/`.
 */
export async function copyPublicAssets({
    packages,
    outDir
}: CopyPublicAssetsOptions): Promise<void> {
    const packagesWithAssets = packages
        .filter((pkg) => pkg.publicAssets.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

    // TODO: Make this configurable; this would mean that not all package copies can be parallel
    await Promise.all(packagesWithAssets.map((pkg) => copyPackageAssets(pkg, outDir)));
}

async function copyPackageAssets(pkg: AnalyzedPackage, outDir: string) {
    const packageDir = join(outDir, PACKAGE_ASSETS_DIR, packageNameToSlug(pkg.name));
    // Copied one after another in reverse. This way, the first entry "wins".
    for (const { directory, dest } of pkg.publicAssets.toReversed()) {
        // oxlint-disable-next-line no-await-in-loop
        await copyDirectory(directory, join(packageDir, dest));
    }
}
