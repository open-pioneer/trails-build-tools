// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { PackageMetadata } from "../metadata/Metadata";

export type PackageMetadataInput = Pick<PackageMetadata, "cssFilePath">;

/**
 * Generates a css file that imports the css file defined by the packages.
 */
export function generateCombinedCss(packages: PackageMetadataInput[]) {
    const cssImport = (file: string) => `@import ${JSON.stringify(file)};`;
    return packages
        .filter((pkg) => !!pkg.cssFilePath)
        .map((pkg) => cssImport(pkg.cssFilePath!)) // eslint-disable-line @typescript-eslint/no-non-null-assertion
        .join("\n");
}
