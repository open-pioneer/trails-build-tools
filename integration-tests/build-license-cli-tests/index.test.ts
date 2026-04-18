// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { cpSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import { TEST_DATA_DIR } from "./paths";
import { helpMessage } from "./runCli";

const PACKAGE_DIR = resolve(TEST_DATA_DIR, "simple-project");

vi.setConfig({
    testTimeout: 20000
});

beforeAll(() => {
    const sourceLockfile = resolve(PACKAGE_DIR, "_pnpm-lock.yaml");
    cpSync(sourceLockfile, resolve(PACKAGE_DIR, "pnpm-lock.yaml"), { recursive: true });
});

it("check help message", async () => {
    const result = await helpMessage(PACKAGE_DIR);
    expect(result).toMatchSnapshot();
});
