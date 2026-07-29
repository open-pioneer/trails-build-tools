// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { mergeConfig, type TsdownPlugin, type UserConfig } from "tsdown";

const LIBRARY_CONFIG: UserConfig = {
    entry: ["./src/index.ts"],
    format: "esm",
    platform: "node",

    dts: {
        // Declaration maps have no inline `sourcesContent`, so they would only work if we shipped
        // `src` as well. Not worth the additional package size.
        sourcemap: false
    },
    sourcemap: true,

    // Keep the plain `.js`.
    fixedExtension: false,
    hash: false,

    // Generate exports in package.json
    exports: true,
    publint: true,
    plugins: [dropDeclarationSourceMappingUrl()]
};

/**
 * The top level `sourcemap` option makes rolldown append a `sourceMappingURL` comment to _every_
 * emitted chunk, including the `.d.ts` (where `dts.sourcemap: false` then suppresses the map file
 * itself). Remove the dangling reference again.
 */
function dropDeclarationSourceMappingUrl(): TsdownPlugin {
    return {
        name: "shared-configs:drop-declaration-source-mapping-url",
        generateBundle(_options, bundle) {
            for (const file of Object.values(bundle)) {
                if (file.type !== "chunk" || !file.fileName.endsWith(".d.ts")) {
                    continue;
                }
                file.code = file.code.replace(/\n?\/\/# sourceMappingURL=\S*\s*$/, "\n");
            }
        }
    };
}

/**
 * Returns the tsdown configuration used to build a publishable library package.
 *
 * It expects the following minimal source folder structure:
 *
 * ```plain
 * <package>
 *  |- src/
 *     |- index.ts       # entry point
 * ```
 *
 * The package must be `"type": "module"` and its `package.json` must list `dist` in `files`.
 *
 * @param overrides Package specific options, merged on top of the shared defaults.
 */
export function defineLibraryConfig(overrides: UserConfig = {}): UserConfig {
    return mergeConfig(LIBRARY_CONFIG, overrides);
}

/**
 * Returns the tsdown configuration used to build a package that only ships an executable
 * (i.e. a package with a `bin` entry and no importable module).
 *
 * Neither type declarations nor an `exports` field are generated for those packages.
 *
 * @param overrides Package specific options, merged on top of the shared defaults.
 */
export function defineCliConfig(overrides: UserConfig = {}): UserConfig {
    return mergeConfig(LIBRARY_CONFIG, { dts: false, exports: false }, overrides);
}
