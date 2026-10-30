// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { resolve } from "node:path";
import { normalizePath } from "vite";
import { assert, it } from "vitest";
import { toPath } from "./Path";

it("makes paths absolute", function () {
    assert.strictEqual(toPath("some/dir/file.txt"), normalizePath(resolve("some/dir/file.txt")));
});

it("removes redundant segments and trailing slashes", function () {
    const base = toPath("/base");
    assert.strictEqual(toPath("/base/a/../b/./c/"), base + "/b/c");
    assert.strictEqual(toPath("/base/a/../b/./c"), base + "/b/c");
});

it("returns an equal path for an already normalized input", function () {
    const path = toPath("/base/dir/file.txt");
    assert.strictEqual(toPath(path), path);
});
