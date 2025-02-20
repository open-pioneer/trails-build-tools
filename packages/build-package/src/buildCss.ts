// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { normalizePath } from "@rollup/pluginutils";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path, { extname, resolve } from "node:path";
import type * as PostCss from "postcss";
import { fileURLToPath, pathToFileURL } from "url";
import type * as Sass from "sass";
import { Logger } from "./utils/Logger";
import { NormalizedEntryPoint } from "./utils/entryPoints";
import { indent } from "./utils/indent";
import { isInDirectory } from "./utils/pathUtils";
import nativePath from "node:path";

export interface BuildCssOptions {
    /** Package name from package.json */
    packageName: string;

    /** Package source directory. */
    packageDirectory: string;

    /** Destination directory. */
    outputDirectory: string;

    /** Main css file. */
    cssEntryPoint: NormalizedEntryPoint;

    /** Whether to emit .map files */
    sourceMap: boolean;

    logger: Logger;
}

export async function buildCss({
    packageDirectory,
    outputDirectory,
    cssEntryPoint,
    sourceMap,
    logger
}: BuildCssOptions): Promise<void> {
    const sourcePath = resolve(packageDirectory, cssEntryPoint.inputModulePath);
    if (!existsSync(sourcePath)) {
        throw new Error(`Style entry point does not exist: ${sourcePath}`);
    }

    // Load preprocessor (e.g. SCSS)
    const preprocessorLang = parsePreprocessorLang(cssEntryPoint.inputModulePath);
    const preprocessor = preprocessorLang
        ? await loadPreprocessor(preprocessorLang, logger)
        : undefined;

    // Read code and preprocess. This step may produce inlined source maps (if enabled).
    let code = await readFile(sourcePath, "utf-8");
    if (preprocessor) {
        const result = await preprocessor.preprocess(code, {
            path: sourcePath,
            sourceMap,
            packageDirectory
        });
        code = addSourceMap(result.code, result.map);
    }

    // Configure postcss, including import handling.
    const postcss = (await import("postcss")).default;
    const postcssImport = (await import("postcss-import")).default;
    const processor = postcss([
        postcssImport({
            // Only process local imports; do not bundle external css files
            filter(path) {
                return /^\.?\.\//.test(path);
            },
            resolve(id, basedir) {
                const candidate = resolve(basedir, id);
                if (/[\\/]node_modules[\\/]/.test(candidate)) {
                    throw new Error(
                        `Detected an attempt to import from node_modules. Use an absolute import instead (e.g. 'packageName/foo.css').\n` +
                            `The offending file is ${candidate}`
                    );
                }
                return candidate;
            }
        })
    ]);

    // Run postcss on the (possibly preprocessed) code.
    let result: PostCss.Result;
    try {
        let sourceMapOptions: PostCss.SourceMapOptions | undefined = undefined;
        if (sourceMap) {
            sourceMapOptions = {
                inline: false,
                sourcesContent: true,
                absolute: false
            };
        }
        result = await processor.process(code, {
            from: sourcePath,
            // this ensures that the file name in the source map is correct when
            // the input file is not a .css file
            to: replaceExtension(sourcePath, ".css"),
            map: sourceMapOptions
        });
    } catch (e) {
        throw new Error(`Failed to process styles`, { cause: e });
    }

    for (const warning of result.warnings()) {
        logger.warn(warning.toString());
    }

    // Write output, including source map.
    try {
        const destPath = resolve(outputDirectory, cssEntryPoint.outputModuleId + ".css");
        await mkdir(outputDirectory, { recursive: true });
        await writeFile(destPath, result.css, "utf-8");

        if (sourceMap) {
            const sourcemapDestPath = destPath + ".map";
            await writeFile(sourcemapDestPath, JSON.stringify(result.map.toJSON()), "utf-8");
        }
    } catch (e) {
        throw new Error(`Failed to write css output`, { cause: e });
    }
}

async function loadPreprocessor(lang: "scss", logger: Logger) {
    if (lang !== "scss") {
        throw new Error(`Unsupported preprocessor language '${lang}'`);
    }

    let compileStringAsync: (typeof Sass)["compileStringAsync"];
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sassModule: any = await import("sass");

        // "Real" named exports are not present in all versions
        compileStringAsync =
            (sassModule as typeof Sass)?.compileStringAsync ??
            (sassModule?.default as typeof Sass)?.compileStringAsync;
        if (!compileStringAsync) {
            throw new Error("Export 'compileStringAsync' was not found.");
        }
    } catch (e) {
        throw new Error(`The package 'sass' must be installed to enable scss support.`, {
            cause: e
        });
    }

    return {
        async preprocess(
            code: string,
            options: { path: string; sourceMap: boolean; packageDirectory: string }
        ) {
            const { path, sourceMap, packageDirectory } = options;
            const result = await compileStringAsync(code, {
                loadPaths: [resolve(packageDirectory, "node_modules")],
                syntax: "scss",
                url: pathToFileURL(path),
                sourceMap: sourceMap,
                sourceMapIncludeSources: true,

                // https://sass-lang.com/documentation/js-api/interfaces/Logger-1
                logger: {
                    debug: () => undefined, // Do nothing
                    warn(message, options) {
                        let output = message;
                        if (options.stack) {
                            output += "\n" + indent(options.stack, "    ");
                        }
                        logger.warn(output);
                    }
                }
            });

            let map = result.sourceMap;
            if (map) {
                map = fixSassSourceMapPaths(map, packageDirectory);
            }
            return { code: result.css, map };
        }
    };
}

function parsePreprocessorLang(entryPoint: string) {
    const ext = extname(entryPoint);
    switch (ext) {
        case ".css":
            return undefined;
        case ".scss":
            return "scss";
        default:
            throw new Error(
                `Invalid file extension '${ext}' for styles. Supported extensions are .css and .scss.`
            );
    }
}

/**
 * Adds an inline source map comment at the end of the css code.
 */
function addSourceMap(code: string, sourceMap: unknown) {
    if (!sourceMap) {
        return code;
    }

    const encodedMap = Buffer.from(JSON.stringify(sourceMap), "utf-8").toString("base64");
    if (!code.endsWith("\n")) {
        code += "\n";
    }

    // Written in this weird separated way on purpose because vitest somehow
    // produces syntax errors when it finds a source map string in the code.
    code += "/*";
    code += "# sourceMappingURL=data:application/json;";
    code += `charset=utf-8;base64,${encodedMap}`;
    code += "*/";
    return code;
}

/**
 * Fixes source paths in source maps produced by sass, which can then be consumed by post css.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fixSassSourceMapPaths(sourceMapJson: any, packageDirectory: string) {
    return {
        ...sourceMapJson,
        // sass uses file:// urls instead of local paths-
        // this maps them to the same format used by postcss
        sources: sourceMapJson.sources.map((url: string) => {
            const nativeSourcePath = fileURLToPath(url);
            if (isInDirectory(nativeSourcePath, packageDirectory)) {
                const relativeSourcePath = nativePath.relative(packageDirectory, nativeSourcePath);
                return normalizePath(relativeSourcePath);
            }
            return normalizePath(nativeSourcePath);
        })
    };
}

function replaceExtension(file: string, newExtension: string) {
    const { dir, name } = path.parse(file);
    return path.format({ dir, name, ext: newExtension });
}
