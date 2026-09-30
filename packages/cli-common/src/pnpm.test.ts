// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { assertSupportedPnpmVersion, checkPnpmVersion, getPnpmVersion } from "./pnpm";

const PACKAGE_DIR = resolve(fileURLToPath(import.meta.url), "../..");

it("accepts supported versions", () => {
    expect(() => assertSupportedPnpmVersion("11.0.0")).not.toThrow();
    expect(() => assertSupportedPnpmVersion("12.4.2")).not.toThrow();
});

it("rejects old versions", () => {
    expect(() => assertSupportedPnpmVersion("10.34.5")).toThrowErrorMatchingInlineSnapshot(
        `[Error: Unsupported pnpm version '10.34.5': this tool requires pnpm >= 11.]`
    );
});

it("rejects garbage", () => {
    expect(() => assertSupportedPnpmVersion("")).toThrowErrorMatchingInlineSnapshot(
        `[Error: Unsupported pnpm version '': this tool requires pnpm >= 11.]`
    );
});

it("returns the version of the installed pnpm", async () => {
    const version = await getPnpmVersion(PACKAGE_DIR);
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
});

it("accepts the installed pnpm", async () => {
    await expect(checkPnpmVersion(PACKAGE_DIR)).resolves.toBeUndefined();
});
