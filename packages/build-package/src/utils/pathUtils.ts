// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { basename, relative, isAbsolute } from "node:path";

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
 * Returns true if `file` is a child of `directory`.
 *
 * If `allowSame` is true, then `file` and `directory` may also refer to the same file.
 */
export function isInDirectory(file: string, directory: string, allowSame = false): boolean {
    const rel = relative(directory, file);
    const isChild = rel && !rel.startsWith("..") && !isAbsolute(rel);
    return !!isChild || (allowSame && rel === "");
}

/**
 * Splits a module id into a fileName and query (after '?') part.
 */
export function getFileNameWithQuery(moduleId: string) {
    const match = moduleId.match(/^(?<fileName>.*?)(?:\?(?<query>.*))?$/)?.groups ?? {};
    const { fileName = moduleId, query = "" } = match;
    return { fileName, query };
}
