// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import { PROJECT_DIR } from "./testing/paths";
import { createLicenseFile } from "./create-license-report";
import { useTemporaryPnpmLockfile } from "./testing/helpers";

vi.setConfig({
    testTimeout: 10000
});
useTemporaryPnpmLockfile(PROJECT_DIR);

it("expect to create a license html", async () => {
    const config = resolve(PROJECT_DIR, "license-config.yaml");
    const htmlOutput = resolve(PROJECT_DIR, "test-a.html");

    await createLicenseFile({
        dev: false,
        ignoreWorkspace: true,
        log: false,
        outputHtmlPath: htmlOutput,
        workingDir: PROJECT_DIR,
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
    const config = resolve(PROJECT_DIR, "license-config-all.yaml");
    const htmlOutput = resolve(PROJECT_DIR, "test-abc.html");

    await createLicenseFile({
        dev: true,
        ignoreWorkspace: true,
        log: false,
        outputHtmlPath: htmlOutput,
        workingDir: PROJECT_DIR,
        configPath: config
    });

    expect(existsSync(htmlOutput)).toBe(true);
    const html = readFileSync(htmlOutput, "utf-8");
    expect(html).toContain("simple-project");
    expect(html).toContain("package-a");
    expect(html).toContain("package-b");
    expect(html).toContain("package-c");
});
