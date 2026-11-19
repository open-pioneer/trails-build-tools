// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { lstat, readdir, readFile, rm } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { TEMP_DATA_DIR, TEST_DATA_DIR } from "../test-utils/paths";
import { copyPublicAssetDirectory } from "./copyPublicAssetDirectory";

const FIXTURE_DIR = resolve(TEST_DATA_DIR, "copy-public-asset-directory");
const OUT_DIR = resolve(TEMP_DATA_DIR, "copy-public-asset-directory");

beforeEach(async () => {
    await rm(OUT_DIR, { recursive: true, force: true });
});

it("copies all files and skips names starting with a dot", async () => {
    await copyPublicAssetDirectory(join(FIXTURE_DIR, "public-assets"), OUT_DIR);

    expect(await listFiles(OUT_DIR)).toEqual(["linked.txt", "nested/deep/file.txt", "root.txt"]);
    expect(await readFile(join(OUT_DIR, "nested/deep/file.txt"), "utf-8")).toBe("nested\n");
});

it("copies a symlinked file as a file", async () => {
    await copyPublicAssetDirectory(join(FIXTURE_DIR, "public-assets"), OUT_DIR);

    const linked = join(OUT_DIR, "linked.txt");
    expect((await lstat(linked)).isFile()).toBe(true);
    expect(await readFile(linked, "utf-8")).toBe("link-target\n");
});

it("copies a directory whose absolute path contains a dot directory", async () => {
    await copyPublicAssetDirectory(join(FIXTURE_DIR, ".pnpm/pkg/public"), OUT_DIR);

    expect(await listFiles(OUT_DIR)).toEqual(["file.txt"]);
});

async function listFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    return entries
        .filter((entry) => !entry.isDirectory())
        .map((entry) => relative(dir, join(entry.parentPath, entry.name)).replaceAll("\\", "/"))
        .sort();
}
