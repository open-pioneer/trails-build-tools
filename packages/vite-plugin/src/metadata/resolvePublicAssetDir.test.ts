// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { realpathSync } from "node:fs";
import { relative, resolve } from "node:path";
import { normalizePath } from "vite";
import { expect, it } from "vitest";
import { TEST_DATA_DIR } from "../utils/testUtils";
import { resolvePublicAssetDir } from "./resolvePublicAssetDir";

const FIXTURE_DIR = realpathSync(resolve(TEST_DATA_DIR, "codegen-public-assets"));
const PACKAGE_DIR = resolve(FIXTURE_DIR, "src/packages/package-with-assets");

it("resolves a directory inside a dependency", async () => {
    const dir = await resolvePublicAssetDir("package-with-assets", PACKAGE_DIR, {
        type: "dependency",
        packageName: "third-party-lib",
        src: "cdn",
        dest: "third-party-lib"
    });
    expect(normalizePath(relative(FIXTURE_DIR, dir.directory))).toBe(
        "src/packages/package-with-assets/node_modules/third-party-lib/cdn"
    );
    expect(dir.dest).toBe("third-party-lib");
});

it("throws if a local directory does not exist", async () => {
    await expect(
        resolvePublicAssetDir("package-with-assets", PACKAGE_DIR, {
            type: "local",
            src: "missing",
            dest: ""
        })
    ).rejects.toThrow(
        /The public asset directory 'missing' of package 'package-with-assets' does not exist: .*missing/
    );
});

it("throws if the path is not a directory", async () => {
    await expect(
        resolvePublicAssetDir("package-with-assets", PACKAGE_DIR, {
            type: "local",
            src: "public/root.txt",
            dest: ""
        })
    ).rejects.toThrow(
        /The public asset directory 'public\/root.txt' of package 'package-with-assets' is not a directory: .*root.txt/
    );
});

it("throws if the dependency cannot be found", async () => {
    await expect(
        resolvePublicAssetDir("package-with-assets", PACKAGE_DIR, {
            type: "dependency",
            packageName: "missing-lib",
            src: "cdn",
            dest: ""
        })
    ).rejects.toThrow(
        /Failed to find package 'missing-lib' for the public asset directory 'missing-lib\/cdn' of package 'package-with-assets'/
    );
});

it("throws if a directory inside a dependency does not exist", async () => {
    await expect(
        resolvePublicAssetDir("package-with-assets", PACKAGE_DIR, {
            type: "dependency",
            packageName: "third-party-lib",
            src: "missing",
            dest: ""
        })
    ).rejects.toThrow(
        /The public asset directory 'third-party-lib\/missing' of package 'package-with-assets' does not exist/
    );
});
