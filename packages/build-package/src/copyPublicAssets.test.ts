// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { copyPublicAssets } from "./copyPublicAssets";
import { cleanDir, readText } from "./testing/io";
import { TEST_DATA_DIR, tempDirForTest } from "./testing/paths";

const TEMP_DATA_DIR = tempDirForTest(import.meta.url);

it("copies public asset directories to the same path in the output directory", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "project-with-public-assets");
    const outputDirectory = resolve(TEMP_DATA_DIR, "project-with-public-assets");

    await cleanDir(outputDirectory);
    await copyPublicAssets({
        packageDirectory,
        outputDirectory,
        publicAssets: [{ type: "local", src: "public", dest: "" }]
    });

    expect(readText(resolve(outputDirectory, "public/file.txt"))).toBe("root file\n");
    expect(readText(resolve(outputDirectory, "public/nested/file.txt"))).toBe("nested file\n");
    expect(existsSync(resolve(outputDirectory, "public/.hidden"))).toBe(false);
    expect(existsSync(resolve(outputDirectory, "node_modules"))).toBe(false);
});

it("copies a directory whose own path contains a dot name", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "project-with-public-assets");
    const outputDirectory = resolve(TEMP_DATA_DIR, "project-with-dot-directory");

    await cleanDir(outputDirectory);
    await copyPublicAssets({
        packageDirectory,
        outputDirectory,
        publicAssets: [{ type: "local", src: ".well-known/data", dest: "data" }]
    });

    expect(existsSync(resolve(outputDirectory, ".well-known/data/file.txt"))).toBe(true);
});
