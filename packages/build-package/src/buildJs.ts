// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { RollupLog, rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import { resolvePlugin } from "./rollup/resolve";
import { normalizePath } from "@rollup/pluginutils";
import nativePath from "node:path";
import { Logger } from "./utils/Logger";
import { cwd } from "node:process";
import { NormalizedEntryPoint } from "./utils/entryPoints";
import { getSourcePathForSourceMap, isInDirectory } from "./utils/pathUtils";
import { SUPPORTED_JS_EXTENSIONS } from "./model/PackageModel";

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

    logger: Logger;
}

export async function buildJs({
    packageName,
    packageDirectory,
    outputDirectory,
    entryPoints,
    sourceMap,
    logger
}: BuildJsOptions) {
    const result = await rollup({
        input: Object.fromEntries(entryPoints.map((e) => [e.outputModuleId, e.inputModulePath])),
        plugins: [
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
                const relative = nativePath.relative(packageDirectory, nativeSourcePath);
                return getSourcePathForSourceMap(packageName, normalizePath(relative));
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
