// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { cp } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { LocalPublicAssetConfig } from "@open-pioneer/build-common";
import { createDebugger } from "./utils/debug";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:copy-public-assets");

export interface CopyPublicAssetsOptions {
    /** Package source directory. */
    packageDirectory: string;

    /** Output directory. */
    outputDirectory: string;

    /** Public asset directories inside the package. */
    publicAssets: LocalPublicAssetConfig[];
}

/**
 * Copies each public asset directory to the same relative path in `outputDirectory`,
 * skipping files and directories whose name starts with `.`.
 */
export async function copyPublicAssets({
    packageDirectory,
    outputDirectory,
    publicAssets
}: CopyPublicAssetsOptions): Promise<void> {
    for (const { src } of publicAssets) {
        const absoluteSrc = resolve(packageDirectory, src);
        const absoluteDst = resolve(outputDirectory, src);
        try {
            isDebug && debug("Copying public assets from %s to %s", absoluteSrc, absoluteDst);
            // One after the other, because one directory may lie inside another one.
            // oxlint-disable-next-line no-await-in-loop
            await cp(absoluteSrc, absoluteDst, {
                recursive: true,
                dereference: true,
                force: true,
                // Only names below `src` count, `src` itself may be a dot directory.
                filter: (source) =>
                    !relative(absoluteSrc, source)
                        .split(sep)
                        .some((name) => name.startsWith("."))
            });
        } catch (e) {
            throw new Error(`Failed to copy public assets from '${src}' to ${absoluteDst}`, {
                cause: e
            });
        }
    }
}
