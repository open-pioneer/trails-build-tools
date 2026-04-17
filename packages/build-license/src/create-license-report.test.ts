// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { TEST_DATA_DIR } from "./testing/paths";
import { createLicenseFile } from "./create-license-report";

// vi.mock("./pnpm-license-report", async () => {
//     const actual =
//         await vi.importActual<typeof import("./pnpm-license-report")>("./pnpm-license-report");
//
//     return {
//         ...actual,
//         getPnpmLicenseReport: vi.fn()
//     };
// });
//
// vi.setConfig({
//     testTimeout: 20000
// });
//
// afterEach(() => {
//     vi.restoreAllMocks();
// });

it("expect pnpm license to show right license", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "simple-project");
    const packageJSON = resolve(packageDirectory, "package.json");
    const config = resolve(packageDirectory, "license-config.yaml");
    const htmlOutput = resolve(packageDirectory, "test.html");

    await createLicenseFile({
        dev: false,
        ignoreWorkspace: true,
        log: true,
        outputHtmlPath: htmlOutput,
        packageJsonPath: packageJSON,
        configPath: config
    });

    expect(existsSync(htmlOutput)).toBe(true);
    expect(readFileSync(htmlOutput, "utf-8")).toContain("simple-project");
    expect(readFileSync(htmlOutput, "utf-8")).toContain("typescript");
});
