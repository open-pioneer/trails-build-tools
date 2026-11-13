// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

/**
 * Returns the module content to implement the `open-pioneer:assets` module.
 *
 * `packageDir` is the package's asset directory relative to the base URL.
 * It may contain any number of slashes, and ends with a slash.
 */
export function generatePublicAssetsModule(packageDir: string): string {
    if (!packageDir.endsWith("/")) {
        throw new Error("The package directory must end with '/'");
    }

    return `
import { baseUrl } from "open-pioneer:deployment";

export const publicAssetsUrl = new URL(${JSON.stringify(packageDir)}, baseUrl).href;
export function getPublicAssetUrl(localAssetPath) {
    return new URL(localAssetPath, publicAssetsUrl).href;
}
    `.trim();
}
