// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { cpSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, expect, it, vi } from "vitest";
import { TEST_DATA_DIR } from "./testing/paths";
import { createLicenseFile } from "./create-license-report";

vi.setConfig({
    testTimeout: 20000
});

beforeAll(() => {
    const packageDirectory = resolve(TEST_DATA_DIR, "simple-project");
    const sourceLockfile = resolve(packageDirectory, "_pnpm-lock.yaml");
    cpSync(sourceLockfile, resolve(packageDirectory, "pnpm-lock.yaml"), { recursive: true });
});

it("expect to create a license html", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "simple-project");
    const config = resolve(packageDirectory, "license-config.yaml");
    const htmlOutput = resolve(packageDirectory, "test-a.html");

    await createLicenseFile({
        dev: false,
        ignoreWorkspace: true,
        log: false,
        outputHtmlPath: htmlOutput,
        workingDir: packageDirectory,
        configPath: config
    });

    expect(existsSync(htmlOutput)).toBe(true);
    const html = readFileSync(htmlOutput, "utf-8");
    expect(html).toContain("simple-project");
    expect(html).toContain("package-a");
    expect(html).not.toContain("package-b");
    expect(html).not.toContain("package-c");
});

it("expect to create a license html with dev dependencies", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "simple-project");
    const config = resolve(packageDirectory, "license-config-all.yaml");
    const htmlOutput = resolve(packageDirectory, "test-abc.html");

    await createLicenseFile({
        dev: true,
        ignoreWorkspace: true,
        log: false,
        outputHtmlPath: htmlOutput,
        workingDir: packageDirectory,
        configPath: config
    });

    expect(existsSync(htmlOutput)).toBe(true);
    const html = readFileSync(htmlOutput, "utf-8");
    expect(html).toContain("simple-project");
    expect(html).toContain("package-a");
    expect(html).toContain("package-b");
    expect(html).toContain("package-c");
});
