// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from "tsdown";

// This package does not use the shared library configuration: pnpm loads it as a *config
// dependency*, which means it must be a single CommonJS `pnpmfile.cjs` in the package root.
export default defineConfig({
    entry: ["./src/pnpmfile.ts"],
    format: "cjs",
    platform: "node",
    outDir: ".",

    // Config dependencies cannot have dependencies, so everything must be bundled.
    deps: {
        alwaysBundle: [/.*/]
    },

    // Keep the `.cjs` extension and don't emit a hash into the file name.
    fixedExtension: true,
    hash: false,

    // The output directory is the package root, so only remove the previous output.
    clean: ["./pnpmfile.*"],
    sourcemap: true,

    // Loaded by path, not imported: no declarations and no `exports` field.
    dts: false,
    exports: false,
    publint: true
});
