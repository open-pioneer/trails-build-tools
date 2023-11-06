// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { TEMP_DATA_DIR, TEST_DATA_DIR } from "./testing/paths";
import { resolve } from "node:path";
import { copyAssets } from "./copyAssets";
import { existsSync } from "node:fs";
import { cleanDir } from "./testing/io";

describe("copyAssets", function () {
    it("copies assets matching the configured patterns", async function () {
        const assetsSrc = resolve(TEST_DATA_DIR, "project-with-assets");
        const assetsDst = resolve(TEMP_DATA_DIR, "project-with-assets");

        await cleanDir(assetsDst);
        await copyAssets({
            packageDirectory: assetsSrc,
            outputDirectory: assetsDst,
            patterns: ["foo.txt", "fonts/**", "node_modules/**"]
        });

        const foo_txt = resolve(assetsDst, "foo.txt");
        expect(existsSync(foo_txt)).toBe(true);

        const bar_txt = resolve(assetsDst, "bar.txt");
        expect(existsSync(bar_txt)).toBe(false);

        const font = resolve(assetsDst, "fonts/font.woff2");
        expect(existsSync(font)).toBe(true);

        const dotFile = resolve(assetsDst, "fonts/.dotfile");
        expect(existsSync(dotFile)).toBe(false);

        const nodeModulesFiles = resolve(assetsDst, "node_modules/not_copied");
        expect(existsSync(nodeModulesFiles)).toBe(false);
    });
});
