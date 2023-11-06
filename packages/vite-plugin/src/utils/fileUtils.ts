// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import * as fs from "node:fs";
import { isAbsolute, relative } from "node:path";

/**
 * Asynchronously checks for the existence of `file`.
 */
export function fileExists(file: string): Promise<boolean> {
    return fs.promises
        .access(file, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}

/**
 * Returns true if `candidate` is a child of `directory`.
 */
export function isInDirectory(candidate: string, directory: string): boolean {
    const rel = relative(directory, candidate);
    const isChild = rel && !rel.startsWith("..") && !isAbsolute(rel);
    return !!isChild;
}
