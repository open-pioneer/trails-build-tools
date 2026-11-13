// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { cp } from "node:fs/promises";
import { relative, sep } from "node:path";

/**
 * Copies all files below `src` into `dest`, skipping files and directories whose name starts with `.`.
 * Symbolic links are copied as the files they point to.
 */
export async function copyDirectory(src: string, dest: string): Promise<void> {
    await cp(src, dest, {
        recursive: true,
        dereference: true,
        force: true,
        // Only the path below `src` counts, because the path of a pnpm dependency contains `.pnpm`.
        filter: (source) =>
            !relative(src, source)
                .split(sep)
                .some((name) => name.startsWith("."))
    });
}
