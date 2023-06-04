// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
/**
 * Returns a 'pretty' path for source files.
 * These are shown in the user's browser dev tools.
 */
import { dirname, join, relative } from "node:path";
import { isInDirectory } from "./pathUtils";

export function rebaseSourcemapPath(
    packageDirectory: string,
    sourceFileInPackage: string,
    outputDirectory: string,
    sourcemapFile: string
): string {
    if (!isInDirectory(sourceFileInPackage, packageDirectory)) {
        throw new Error("Internal error: source file is not part of the package directory.");
    }
    if (!isInDirectory(sourcemapFile, outputDirectory)) {
        throw new Error("Internal error: source map file is not part of the output directory.");
    }

    // Act as if both files are in the same directory
    const relativeSourcePath = relative(packageDirectory, sourceFileInPackage); // e.g. "dir/file.ts"
    const virtualPathInOutput = join(outputDirectory, relativeSourcePath); // e.g. $OUTPUT/dir/file.ts
    const relativePathFromSourceMap = relative(dirname(sourcemapFile), virtualPathInOutput);
    return relativePathFromSourceMap;
}
