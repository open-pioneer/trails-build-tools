// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { existsSync, lstatSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { Plugin, PluginContext } from "rollup";
import { normalizePath } from "@rollup/pluginutils";
import { resolveWithExtensions } from "../utils/resolve";
import { getExtension, getFileNameWithQuery } from "../utils/pathUtils";

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

        async resolveId(this: PluginContext, id, parent) {
            // absolute paths are left untouched
            if (isAbsolute(id)) {
                return id;
            }

            const CONTINUE = undefined;
            if (!/^\.?\.\//.test(id)) {
                return CONTINUE;
            }

            // Search for the file in the correct directory.
            // Import ids can look like this:
            //
            //  ./foo
            //  ./foo.js
            //  ./foo.ext?query
            const directory = parent ? dirname(parent) : packageDirectory;
            const { fileName, query } = getFileNameWithQuery(id);
            const resolveResult = resolveFile(resolve(directory, fileName), allowedExtensions);
            if (resolveResult.type === "error") {
                let message;
                switch (resolveResult.kind) {
                    case "ambiguous": {
                        const exts = resolveResult.extensions.join(", ");
                        message = `Imported module ${fileName} matches multiple extensions: ${exts}. Use an explicit extension instead.`;
                        break;
                    }
                    case "not-found": {
                        const exts = allowedExtensions.join(", ");
                        message = `Imported module ${fileName} does not exist. Attempted lookup with extensions ${exts}.`;
                        break;
                    }
                }

                this.error({
                    id: parent,
                    message: message
                });
            }

            // Lookup succeeded.
            const path = resolveResult.path;

            // No query -> must be code
            if (!query) {
                return path;
            }

            // If query and a code file, emit it as a JavaScript chunk
            // to ensure that the file is present in the output.
            // Otherwise, we assume this is asset.
            //
            // In any event, we must mark the export as external because rollup does not understand the query protocol.
            const emitName = normalizePath(relative(packageDirectory, path));
            if (allowedExtensions.includes(getExtension(path))) {
                this.emitFile({
                    type: "chunk",
                    id: path,
                    fileName: emitName
                });
            }
            return {
                id: appendQuery(path, query),
                external: true
            };
        }
    };
}

function appendQuery(id: string, query: string) {
    if (!query) {
        return id;
    }
    return `${id}?${query}`;
}

function resolveFile(path: string, extensions: string[]) {
    if (isDir(path)) {
        path = join(path, "index");
    }
    return resolveWithExtensions(path, extensions);
}

function isDir(path: string) {
    return existsSync(path) && lstatSync(path).isDirectory();
}
