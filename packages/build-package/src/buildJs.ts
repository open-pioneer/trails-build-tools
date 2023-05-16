// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import { rollup } from "rollup";

export interface BuildJSOptions {
    packageDirectory: string;
    entryPoints: string[];
    sourcemap: boolean;
}

export async function buildJS({ packageDirectory, entryPoints, sourcemap }: BuildJSOptions) {
    const resolvedEntryPoints = entryPoints.map((baseName) => [
        baseName,
        resolve(packageDirectory, baseName)
    ]);
    const result = await rollup({
        input: Object.fromEntries(resolvedEntryPoints),
        external(source, _importer, isResolved) {
            return !isResolved && !source.startsWith("./") && !source.startsWith("../");
        }
    });
    await result.write({
        preserveModules: true,
        dir: resolve(packageDirectory, "dist"),
        minifyInternalExports: false,
        compact: false,
        format: "es",
        sourcemap: sourcemap
        // TODO
        // sourcemapPathTransform
    });
}
