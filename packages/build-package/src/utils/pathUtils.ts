// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { normalizePath } from "@rollup/pluginutils";
import { basename } from "node:path";
import posix from "node:path/posix";

/**
 * Returns the extension of the path, starting with the _first_ `.`
 * in the file's basename.
 *
 * The return value includes the `.`.
 */
export function getExtension(path: string) {
    const filename = basename(path);
    return filename.match(/^.*?(\..*)?$/)?.[1] ?? "";
}

/**
 * Returns true if `file` is a child of `directory` or `directory` itself.
 *
 * Expects posix style paths (forward slashes).
 */
export function isInDirectoryPosix(file: string, directory: string): boolean {
    const rel = posix.relative(directory, file);
    const isChild = rel && !rel.startsWith("..") && !posix.isAbsolute(rel);
    return !!isChild;
}

/**
 * Returns a 'pretty' path for source files.
 * These are shown in the user's browser dev tools.
 */
export function getSourcePathForSourceMap(packageName: string, fileInPackage: string) {
    return posix.resolve("/external-packages/", packageName, normalizePath(fileInPackage));
}
