// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { beforeAll, expect, it } from "vitest";
import { prepareLockfileDir } from "./testing/paths";
import { readLockfile } from "./readLockfile";

let projectDir!: string;
beforeAll(() => {
    projectDir = prepareLockfileDir("simple-dups", "read-lockfile");
});

it("reads a simple lockfile (v9)", async () => {
    const lockfile = await readLockfile(projectDir);
    expect(lockfile.lockfileVersion).toMatchInlineSnapshot(`"9.0"`);
});
