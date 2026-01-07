// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { glob } from "tinyglobby";
import { copy } from "fs-extra";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { SNAPSHOT_DIR, TEMP_DATA_DIR, TEST_DATA_DIR } from "./paths";
import { runCli } from "./runCli";
import { rimraf } from "rimraf";

beforeAll(async () => {
    await rimraf(TEMP_DATA_DIR);
    await copy(resolve(TEST_DATA_DIR, "tsconfig.json"), resolve(TEMP_DATA_DIR, "tsconfig.json"));
    await copy(resolve(TEST_DATA_DIR, "types"), resolve(TEMP_DATA_DIR, "types"));
});

describe(
    "package compilations",
    {
        timeout: 30 * 1000
    },
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

        it("should compile the map package successfully", async () => {
            const sourceDir = resolve(TEST_DATA_DIR, "map");
            const snapshotDir = resolve(SNAPSHOT_DIR, "map");
            const { targetDir, stdout, stderr } = await runCli(sourceDir);

            expect(stderr).toBe("");
            expect(stdout).toMatchInlineSnapshot(`
              "Building package at <PATH>
              Building JavaScript...
              Generating TypeScript declaration files...
              Building styles...
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
                "MapRegistryImpl.d.ts",
                "MapRegistryImpl.js",
                "MapRegistryImpl.js.map",
                "README.md",
                "_virtual/_virtual-pioneer-module_react-hooks.js",
                "_virtual/_virtual-pioneer-module_react-hooks.js.map",
                "api/BaseFeature.d.ts",
                "api/MapConfig.d.ts",
                "api/MapModel.d.ts",
                "api/MapRegistry.d.ts",
                "api/index.d.ts",
                "api/layers/SimpleLayer.d.ts",
                "api/layers/SimpleLayer.js",
                "api/layers/SimpleLayer.js.map",
                "api/layers/WMSLayer.d.ts",
                "api/layers/WMSLayer.js",
                "api/layers/WMSLayer.js.map",
                "api/layers/WMTSLayer.d.ts",
                "api/layers/WMTSLayer.js",
                "api/layers/WMTSLayer.js.map",
                "api/layers/base.d.ts",
                "api/layers/index.d.ts",
                "api/shared.d.ts",
                "assets/images/mapMarker.png",
                "index.d.ts",
                "index.js",
                "index.js.map",
                "layers/BkgTopPlusOpen.d.ts",
                "layers/BkgTopPlusOpen.js",
                "layers/BkgTopPlusOpen.js.map",
                "model/AbstractLayer.d.ts",
                "model/AbstractLayer.js",
                "model/AbstractLayer.js.map",
                "model/AbstractLayerBase.d.ts",
                "model/AbstractLayerBase.js",
                "model/AbstractLayerBase.js.map",
                "model/Highlights.d.ts",
                "model/Highlights.js",
                "model/Highlights.js.map",
                "model/LayerCollectionImpl.d.ts",
                "model/LayerCollectionImpl.js",
                "model/LayerCollectionImpl.js.map",
                "model/MapModelImpl.d.ts",
                "model/MapModelImpl.js",
                "model/MapModelImpl.js.map",
                "model/SublayersCollectionImpl.d.ts",
                "model/SublayersCollectionImpl.js",
                "model/SublayersCollectionImpl.js.map",
                "model/createMapModel.d.ts",
                "model/createMapModel.js",
                "model/createMapModel.js.map",
                "model/layers/SimpleLayerImpl.d.ts",
                "model/layers/SimpleLayerImpl.js",
                "model/layers/SimpleLayerImpl.js.map",
                "model/layers/WMSLayerImpl.d.ts",
                "model/layers/WMSLayerImpl.js",
                "model/layers/WMSLayerImpl.js.map",
                "model/layers/WMTSLayerImpl.d.ts",
                "model/layers/WMTSLayerImpl.js",
                "model/layers/WMTSLayerImpl.js.map",
                "package.json",
                "projections.d.ts",
                "projections.js",
                "projections.js.map",
                "services.d.ts",
                "services.js",
                "services.js.map",
                "ui/MapAnchor.d.ts",
                "ui/MapAnchor.js",
                "ui/MapAnchor.js.map",
                "ui/MapContainer.d.ts",
                "ui/MapContainer.js",
                "ui/MapContainer.js.map",
                "ui/MapContext.d.ts",
                "ui/MapContext.js",
                "ui/MapContext.js.map",
                "ui/hooks.d.ts",
                "ui/hooks.js",
                "ui/hooks.js.map",
                "ui/styles.css",
                "ui/styles.css.map",
                "ui/useMapModel.d.ts",
                "ui/useMapModel.js",
                "ui/useMapModel.js.map",
                "util/capabilities-utils.d.ts",
                "util/capabilities-utils.js",
                "util/capabilities-utils.js.map",
                "util/defer.d.ts",
                "util/defer.js",
                "util/defer.js.map",
                "util/geometry-utils.d.ts",
                "util/geometry-utils.js",
                "util/geometry-utils.js.map",
                "util/ol-test-support.d.ts",
                "util/ol-test-support.js",
                "util/ol-test-support.js.map",
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

        it("should compile the search package successfully", async () => {
            const sourceDir = resolve(TEST_DATA_DIR, "search");
            const snapshotDir = resolve(SNAPSHOT_DIR, "search");
            const { targetDir, stdout, stderr } = await runCli(sourceDir);

            expect(stderr).toBe("");
            expect(stdout).toMatchInlineSnapshot(`
              "Building package at <PATH>
              Building JavaScript...
              Generating TypeScript declaration files...
              Building styles...
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
                "CustomComponents.d.ts",
                "CustomComponents.js",
                "CustomComponents.js.map",
                "LICENSE",
                "README.md",
                "Search.d.ts",
                "Search.js",
                "Search.js.map",
                "SearchController.d.ts",
                "SearchController.js",
                "SearchController.js.map",
                "_virtual/_virtual-pioneer-module_react-hooks.js",
                "_virtual/_virtual-pioneer-module_react-hooks.js.map",
                "api.d.ts",
                "i18n/de.yaml",
                "i18n/en.yaml",
                "index.d.ts",
                "index.js",
                "index.js.map",
                "package.json",
                "search.css",
                "search.css.map",
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
    }
);

function snapshotPath(snapshotDir: string, filename: string) {
    return resolve(snapshotDir, filename.replace(/[\\/]/g, "_"));
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
