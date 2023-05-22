// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import { resolvePlugin } from "./rollup/resolve";
import { normalizePath } from "@rollup/pluginutils";
import posix from "node:path/posix";
import { NormalizedEntryPoint, getSourcePathForSourceMap } from "./helpers";

export const SUPPORTED_EXTENSIONS = [".ts", ".mts", ".tsx", ".js", ".mjs", ".jsx"];

export interface BuildJsOptions {
    /** Package name from package.json */
    packageName: string;

    /** Package source directory. */
    packageDirectory: string;

    /** Destination directory. */
    outputDirectory: string;

    /** Exported modules. */
    entryPoints: NormalizedEntryPoint[];

    /** Whether to emit .map files */
    sourceMap: boolean;

    /** Disable warnings. Used for tests. */
    silent?: boolean;
}

export async function buildJs({
    packageName,
    packageDirectory,
    outputDirectory,
    entryPoints,
    sourceMap: sourceMap,
    silent
}: BuildJsOptions) {
    const result = await rollup({
        input: Object.fromEntries(entryPoints.map((e) => [e.outputModuleId, e.inputModulePath])),
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
    const normalizePackageDirectory = normalizePath(packageDirectory);
    await result.write({
        preserveModules: true,
        dir: outputDirectory,
        minifyInternalExports: false,
        compact: false,
        format: "es",
        sourcemap: sourceMap,

        // Prettier source map paths.
        // See https://rollupjs.org/configuration-options/#output-sourcemappathtransform
        sourcemapPathTransform: (relativeSourcePath, sourceMapPath) => {
            relativeSourcePath = normalizePath(relativeSourcePath);
            sourceMapPath = normalizePath(sourceMapPath);
            const absolutePath = posix.resolve(posix.dirname(sourceMapPath), relativeSourcePath);
            if (isInDirectory(absolutePath, normalizePackageDirectory)) {
                const relative = posix.relative(normalizePackageDirectory, absolutePath);
                return getSourcePathForSourceMap(packageName, relative);
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
