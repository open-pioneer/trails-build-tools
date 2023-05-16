// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { existsSync, lstatSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { Plugin } from "rollup";
import { normalizePath } from "@rollup/pluginutils";

export interface ResolvePluginOptions {
    packageDirectory: string;
    allowedExtensions: string[];
}

export function resolvePlugin({
    packageDirectory,
    allowedExtensions
}: ResolvePluginOptions): Plugin {
    if (!allowedExtensions || !allowedExtensions.length) {
        throw new Error(`Must specify { extensions: [...] } as a non-empty array!`);
    }

    return {
        name: "resolve",

        async resolveId(id, parent) {
            // absolute paths are left untouched
            if (isAbsolute(id)) {
                return id;
            }

            const EXTERNAL = false;
            if (!/^\.?\.\//.test(id)) {
                return EXTERNAL;
            }

            // Search for the file in the correct directory.
            // Import ids can look like this:
            //
            //  ./foo
            //  ./foo.js
            //  ./foo.ext&query
            const directory = parent ? dirname(parent) : packageDirectory;
            const { fileName, query } = getFileNameWithQuery(id);
            const resolved = resolveFile(resolve(directory, fileName), allowedExtensions);
            if (resolved) {
                // No query -> must be code
                if (!query) {
                    return resolved;
                }

                // If query and a code file, emit it as a JavaScript chunk
                // to ensure that the file is present in the output.
                // Otherwise, we assume this is asset.
                //
                // In any event, we must mark the export as external because rollup does not understand the query protocol.
                const emitName = normalizePath(relative(packageDirectory, resolved));
                if (allowedExtensions.includes(getExtension(resolved))) {
                    this.emitFile({
                        type: "chunk",
                        id: resolved,
                        fileName: emitName
                    });
                }
                return {
                    id: appendQuery(resolved, query),
                    external: true
                };
            }

            this.error({
                id: parent,
                message: `Imported file does not exist: ${fileName}`
            });
        }
    };
}

function getFileNameWithQuery(id: string) {
    const match = id.match(/^(?<fileName>.*?)(?:\?(?<query>.*))?$/)?.groups ?? {};
    const { fileName = id, query = "" } = match;
    return { fileName, query };
}

function appendQuery(id: string, query: string) {
    if (!query) {
        return id;
    }
    return `${id}?${query}`;
}

function getExtension(path: string) {
    const filename = basename(path);
    return filename.match(/^.*?(\..*)?$/)?.[1] ?? "";
}

function resolveFile(file: string, extensions: string[]) {
    if (isDir(file)) {
        return tryExtensions(join(file, "index"), extensions);
    }
    return tryExtensions(file, extensions);
}

function tryExtensions(file: string, extensions: string[]) {
    if (existsSync(file)) {
        return file;
    }

    for (const ext of extensions) {
        const fileAttempt = file + ext;
        if (existsSync(fileAttempt)) {
            return fileAttempt;
        }
    }
    return undefined;
}

function isDir(path: string) {
    return existsSync(path) && lstatSync(path).isDirectory();
}
