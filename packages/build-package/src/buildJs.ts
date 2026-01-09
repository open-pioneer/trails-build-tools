// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { LogLevel, RollupLog, rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import { resolvePlugin } from "./rollup/resolve";
import nativePath, { posix } from "node:path";
import { Logger } from "./utils/Logger";
import { cwd } from "node:process";
import { NormalizedEntryPoint } from "./utils/entryPoints";
import { isInDirectory } from "./utils/pathUtils";
import { SUPPORTED_JS_EXTENSIONS } from "./model/PackageModel";
import { REACT_HOOKS_ID, SOURCE_INFO_ID, virtualModulesPlugin } from "./rollup/virtualModules";
import { checkImportsPlugin } from "./rollup/checkImports";
import { rebaseSourcemapPath } from "./utils/sourceMaps";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { normalizePath } from "@rollup/pluginutils";

export interface BuildJsOptions {
    /** Package name from package.json */
    packageName: string;

    /** Package source directory. */
    packageDirectory: string;

    /** Path to the package.json file. */
    packageJsonPath: string;

    /** Package json of the package. */
    packageJson: Record<string, unknown>;

    /** Workspace root. Needed to detect which packages are local. */
    rootDirectory: string;

    /** Destination directory. */
    outputDirectory: string;

    /** Exported modules. */
    entryPoints: NormalizedEntryPoint[];

    /** Whether to emit .map files */
    sourceMap: boolean;

    strict: boolean;
    logger: Logger;
}

export async function buildJs({
    packageName,
    packageDirectory,
    packageJson,
    packageJsonPath,
    rootDirectory,
    outputDirectory,
    entryPoints,
    sourceMap,
    strict,
    logger
}: BuildJsOptions) {
    const normalizedPackageDirectory = normalizePath(packageDirectory);
    const result = await rollup({
        input: Object.fromEntries(entryPoints.map((e) => [e.outputModuleId, e.inputModulePath])),
        plugins: [
            checkImportsPlugin({
                packageJson,
                packageJsonPath,
                rootDirectory,
                strict
            }),
            virtualModulesPlugin({
                packageName,
                packageDirectory
            }),
            resolvePlugin({
                packageDirectory,
                allowedExtensions: SUPPORTED_JS_EXTENSIONS
            }),
            // Used to look into node modules and verify that packages / modules actually exist.
            // The code in other packages in not bundled, their imports are re-mapped to be external by the checkImportsPlugin.
            nodeResolve({
                // Jail is not really necessary because the checkImportsPlugin checks that the dependency is declared in the package.json.
                // A hard jail interferes with monorepo setups where packages are linked to wild locations.
                // jail: packageDirectory
                rootDir: packageDirectory,
                preferBuiltins: false,
                browser: true,
                exportConditions: ["browser"]
            }),
            esbuild({
                jsx: "automatic",
                jsxDev: false,
                target: "es2022"
            })
        ],
        onLog(level: LogLevel, log: RollupLog) {
            if (log.code === "SOURCEMAP_ERROR" || log.code === "MODULE_LEVEL_DIRECTIVE") {
                // Ignore these warnings.
                // 'use client' directives are currently dropped. If they are needed, take a look at this rollup issue:
                // https://github.com/rollup/rollup/issues/4699
                return;
            }
            if (log.code === "EMPTY_BUNDLE") {
                // Not really an error/warning
                return;
            }

            let method;
            switch (level) {
                case "debug":
                    break;
                case "info":
                case "warn":
                    method = level;
                    break;
            }

            if (method) {
                logger[method]?.(formatMessage(log));
            }
        }
    });
    await result.write({
        dir: outputDirectory,
        minifyInternalExports: false,
        compact: false,
        format: "es",
        sourcemap: sourceMap,

        chunkFileNames: "[name].js",
        hoistTransitiveImports: false,

        manualChunks(id, meta) {
            // Group virtual modules (identified by \0 prefix) into a shared chunk
            if (id.startsWith("\0")) {
                if (id === REACT_HOOKS_ID) {
                    return "_virtual/hooks";
                }
                if (id.startsWith(SOURCE_INFO_ID)) {
                    return "_virtual/source-info";
                }
                return id;
            }

            // A re-implementation of "preserveModules", but for _real_ files only.
            const normalizedId = normalizePath(id);
            const relativePath = posix.relative(normalizedPackageDirectory, normalizedId);
            if (relativePath.match(/^\.\.?[\\/]/)) {
                // must not start with ./ or ../
                throw new Error("Internal error: unexpected relative path");
            }

            const parsedResult = posix.parse(relativePath);
            const nameWithoutExt = parsedResult.name.replace(/\..*$/, "");
            const relativeSourceId = posix.join(parsedResult.dir, nameWithoutExt);
            return relativeSourceId;
        },

        // Prettier source map paths.
        // See https://rollupjs.org/configuration-options/#output-sourcemappathtransform
        sourcemapPathTransform: (relativeSourcePath, sourceMapPath) => {
            const nativeSourcePath = nativePath.resolve(
                nativePath.dirname(sourceMapPath),
                relativeSourcePath
            );
            if (isInDirectory(nativeSourcePath, packageDirectory)) {
                return rebaseSourcemapPath(
                    packageDirectory,
                    nativeSourcePath,
                    outputDirectory,
                    sourceMapPath
                );
            }
            return relativeSourcePath;
        }
    });
}

// See example in https://rollupjs.org/configuration-options/#onwarn
function formatMessage(props: RollupLog): string {
    const { message, frame, loc, id } = props;

    let output = "";
    function write(str: string) {
        output += str;
    }

    write(`${message}\n`);
    if (loc) {
        if (frame) {
            write(`${frame}\n`);
        }
        write(`... in ${formatId(loc.file || id || "")}:${loc.line}:${loc.column}\n`);
    } else if (id) {
        write(`... in ${formatId(id)}\n`);
    }

    return output.trimEnd();
}

function formatId(id: string): string {
    if (!id) {
        return "N/A";
    }

    return nativePath.relative(cwd(), id);
}
