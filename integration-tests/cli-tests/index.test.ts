// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import glob from "fast-glob";
import { copy } from "fs-extra";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { SNAPSHOT_DIR, TEMP_DATA_DIR, TEST_DATA_DIR } from "./paths";
import { runCli } from "./runCli";

beforeAll(async () => {
    await copy(resolve(TEST_DATA_DIR, "tsconfig.json"), resolve(TEMP_DATA_DIR, "tsconfig.json"));
    await copy(resolve(TEST_DATA_DIR, "types"), resolve(TEMP_DATA_DIR, "types"));
});

describe(
    "package compilations",
    () => {
        it("should compile the integration package successfully", async () => {
            const sourceDir = resolve(TEST_DATA_DIR, "integration");
            const snapshotDir = resolve(SNAPSHOT_DIR, "integration");
            const { targetDir, stdout, stderr } = await runCli(sourceDir);

            expect(stderr).toBe("");
            expect(stdout).toMatchInlineSnapshot(`
          "Building package at <PATH>
          Building JavaScript...
          Generating TypeScript declaration files...
          Copying assets...
          Writing package metadata...
          Copying auxiliary files...
          Success
          "
        `);

            const files = await listFiles(targetDir);
            expect(files).toMatchInlineSnapshot(`
          [
            "CHANGELOG.md",
            "ExternalEventServiceImpl.d.ts",
            "ExternalEventServiceImpl.js",
            "ExternalEventServiceImpl.js.map",
            "LICENSE",
            "README.md",
            "api.d.ts",
            "index.d.ts",
            "index.js",
            "index.js.map",
            "package.json",
            "services.d.ts",
            "services.js",
            "services.js.map",
          ]
        `);

            for (const file of files) {
                const content = await readFile(resolve(targetDir, file), "utf-8");
                await expect(content).toMatchFileSnapshot(
                    snapshotPath(snapshotDir, file),
                    `Expected contents of ${file} to match the snapshot`
                );
            }
        });

        it("should compile the ol-layer-control package successfully", async () => {
            const sourceDir = resolve(TEST_DATA_DIR, "ol-layer-control");
            const snapshotDir = resolve(SNAPSHOT_DIR, "ol-layer-control");
            const { targetDir, stdout, stderr } = await runCli(sourceDir);

            expect(stderr).toBe("");
            expect(stdout).toMatchInlineSnapshot(`
          "Building package at <PATH>
          Building JavaScript...
          Generating TypeScript declaration files...
          Copying i18n files...
          Copying assets...
          Writing package metadata...
          Copying auxiliary files...
          Success
          "
        `);

            const files = await listFiles(targetDir);
            expect(files).toMatchInlineSnapshot(`
          [
            "CHANGELOG.md",
            "LICENSE",
            "LayerControlComponent.d.ts",
            "LayerControlComponent.js",
            "LayerControlComponent.js.map",
            "README.md",
            "_virtual/_virtual-pioneer-module_react-hooks.js",
            "_virtual/_virtual-pioneer-module_react-hooks.js.map",
            "i18n/de.yaml",
            "i18n/en.yaml",
            "index.d.ts",
            "index.js",
            "index.js.map",
            "package.json",
          ]
        `);

            for (const file of files) {
                const content = await readFile(resolve(targetDir, file), "utf-8");
                await expect(content).toMatchFileSnapshot(
                    snapshotPath(snapshotDir, file),
                    `Expected contents of ${file} to match the snapshot`
                );
            }
        });
    },
    {
        timeout: 15 * 1000
    }
);

function snapshotPath(snapshotDir, filename) {
    return resolve(snapshotDir, filename.replace(/[\\/]/, "_"));
}

async function listFiles(dir: string): Promise<string[]> {
    const files = await glob("**/*", {
        cwd: dir,
        dot: true,
        onlyFiles: true,
        followSymbolicLinks: false
    });
    files.sort();
    return files;
}
