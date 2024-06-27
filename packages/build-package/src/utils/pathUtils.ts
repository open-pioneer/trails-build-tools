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
 * Returns true if `file` is a child of `directory` or `directory` itself.
 */
export function isInDirectory(file: string, directory: string): boolean {
    const rel = relative(directory, file);
    const isChild = rel && !rel.startsWith("..") && !isAbsolute(rel);
    return !!isChild;
}

/**
 * Splits a module id into a fileName and query (after '?') part.
 */
export function getFileNameWithQuery(moduleId: string) {
    const match = moduleId.match(/^(?<fileName>.*?)(?:\?(?<query>.*))?$/)?.groups ?? {};
    const { fileName = moduleId, query = "" } = match;
    return { fileName, query };
}
