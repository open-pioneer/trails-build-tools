// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import { resolvePlugin } from "./rollup/resolve";
import { normalizePath } from "@rollup/pluginutils";
import posix from "node:path/posix";

const SUPPORTED_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

export interface BuildJsOptions {
    packageName: string;
    packageDirectory: string;
    outputDirectory: string;
    entryPoints: string[];
    sourcemap: boolean;

    /** Disable warnings. Used for tests. */
    silent?: boolean;
}

export async function buildJs({
    packageName,
    packageDirectory,
    outputDirectory,
    entryPoints,
    sourcemap,
    silent
}: BuildJsOptions) {
    // Ensure entry points start with "./".
    // Relative imports are handled by the resolveExtensions plugin, but paths
    // that look like absolute ids are skipped.
    const relativeEntryPoints = entryPoints.map((e) => {
        if (e.startsWith("./")) {
            return e;
        }
        return `./${e}`;
    });
    const result = await rollup({
        input: relativeEntryPoints,
        plugins: [
            resolvePlugin({
                packageDirectory,
                allowedExtensions: SUPPORTED_EXTENSIONS
            }),
            esbuild({
                jsx: "automatic",
                jsxDev: false,
                target: "es2022"
            })
        ],
        onwarn: silent ? () => undefined : undefined
    });
    await result.write({
        preserveModules: true,
        dir: outputDirectory,
        minifyInternalExports: false,
        compact: false,
        format: "es",
        sourcemap: sourcemap,

        // Prettier sourcemap paths.
        // See https://rollupjs.org/configuration-options/#output-sourcemappathtransform
        sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
            relativeSourcePath = normalizePath(relativeSourcePath);
            sourcemapPath = normalizePath(sourcemapPath);
            const absolutePath = posix.resolve(posix.dirname(sourcemapPath), relativeSourcePath);
            if (isInDirectory(absolutePath, packageDirectory)) {
                const relative = posix.relative(packageDirectory, absolutePath);
                return `packages/${packageName}/${relative}`;
            }
            return relativeSourcePath;
        }
    });
}

function isInDirectory(file: string, directory: string): boolean {
    const rel = posix.relative(directory, file);
    const isChild = rel && !rel.startsWith("..") && !posix.isAbsolute(rel);
    return !!isChild;
}
