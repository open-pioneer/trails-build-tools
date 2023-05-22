// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { writeFile, readFile } from "fs/promises";
import { resolve } from "node:path";
import type * as PostCss from "postcss";
import { NormalizedEntryPoint, getSourcePathForSourceMap } from "./helpers";

export const SUPPORTED_EXTENSIONS = [".css", ".scss"];

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

    /** Disable warnings. Used for tests. */
    silent?: boolean;
}

export async function buildCss({
    packageName,
    packageDirectory,
    outputDirectory,
    cssEntryPoint,
    sourceMap,
    silent
}: BuildCssOptions): Promise<void> {
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

    const cssSrcPath = resolve(packageDirectory, cssEntryPoint.inputModulePath);
    const cssDestPath = resolve(outputDirectory, cssEntryPoint.outputModuleId + ".css");
    if (!existsSync(cssSrcPath)) {
        throw new Error(`CSS entry point does not exist: ${cssSrcPath}`);
    }

    let result: PostCss.Result;
    try {
        const cssCode = await readFile(cssSrcPath, "utf-8");

        let sourceMapOptions: PostCss.SourceMapOptions | undefined = undefined;
        if (sourceMap) {
            sourceMapOptions = {
                inline: false,
                sourcesContent: true,
                absolute: false
            };
        }
        result = await processor.process(cssCode, {
            from: cssSrcPath,
            to: cssSrcPath,
            map: sourceMapOptions
        });
    } catch (e) {
        throw new Error(`Failed to process styles`, { cause: e });
    }
    if (!silent) {
        const warnings = result.warnings();
        for (const w of warnings) {
            console.warn(w); // TODO: Pretty logging
        }
    }

    try {
        await mkdir(outputDirectory, { recursive: true });
        await writeFile(cssDestPath, result.css, "utf-8");

        if (sourceMap) {
            const sourceMapJson = fixSourceMapPaths(result.map.toJSON(), packageName);
            await writeFile(cssDestPath + ".map", JSON.stringify(sourceMapJson), "utf-8");
        }
    } catch (e) {
        throw new Error(`Failed to write css output`, { cause: e });
    }
}

/**
 * Relies on the fact that postcss generates source maps that are relative to the
 * source package root.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fixSourceMapPaths(sourceMapJson: any, packageName: string) {
    return {
        ...sourceMapJson,
        sources: sourceMapJson.sources?.map((sourceFile: string) =>
            getSourcePathForSourceMap(packageName, sourceFile)
        )
    };
}
