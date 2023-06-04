// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { RollupLog, rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import { resolvePlugin } from "./rollup/resolve";
import nativePath from "node:path";
import { Logger } from "./utils/Logger";
import { cwd } from "node:process";
import { NormalizedEntryPoint } from "./utils/entryPoints";
import { isInDirectory } from "./utils/pathUtils";
import { SUPPORTED_JS_EXTENSIONS } from "./model/PackageModel";
import { virtualModulesPlugin } from "./rollup/virtualModules";
import { checkImportsPlugin } from "./rollup/checkImports";
import { rebaseSourcemapPath } from "./utils/sourceMaps";

export interface BuildJsOptions {
    /** Package name from package.json */
    packageName: string;

    /** Package source directory. */
    packageDirectory: string;

    /** Path to the package.json file. */
    packageJsonPath: string;

    /** Package json of the package. */
    packageJson: Record<string, unknown>;

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
    outputDirectory,
    entryPoints,
    sourceMap,
    strict,
    logger
}: BuildJsOptions) {
    const result = await rollup({
        input: Object.fromEntries(entryPoints.map((e) => [e.outputModuleId, e.inputModulePath])),
        plugins: [
            checkImportsPlugin({
                packageJson,
                packageJsonPath,
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
            esbuild({
                jsx: "automatic",
                jsxDev: false,
                target: "es2022"
            })
        ],
        onwarn(warning) {
            logger.warn(formatMessage(warning));
        }
    });
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
    const { plugin, message, frame, loc, id } = props;

    let output = "";
    function write(str: string) {
        output += str;
    }

    let description = message;
    if (plugin) {
        description = `[plugin ${plugin}] ${description}`;
    }

    write(`${description}\n`);
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
