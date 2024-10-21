// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { TEST_DATA_DIR } from "./testing/paths";
import { readLockfile } from "./readLockfile";

it("reads a simple lockfile (v9)", async () => {
    const directory = resolve(TEST_DATA_DIR, "simple-dups");
    const lockfile = await readLockfile(directory);
    expect(lockfile.lockfileVersion).toMatchInlineSnapshot(`"9.0"`);
});
