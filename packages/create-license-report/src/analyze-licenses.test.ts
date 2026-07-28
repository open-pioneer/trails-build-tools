// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { afterEach, expect, it, onTestFailed, vi } from "vitest";
import { resolve } from "node:path";
import { PROJECT_DIR } from "./testing/paths";
import { PnpmLicenseProject } from "./pnpm-license-report";
import { readLicenseConfig } from "./license-config";
import { analyzeLicenses } from "./analyze-licenses";

afterEach(() => {
    vi.restoreAllMocks();
});

it("expect to analyze the dependencies", async () => {
    const configPath = resolve(PROJECT_DIR, "license-config.yaml");
    const projects = mockPnpmProjects();
    const config = readLicenseConfig(configPath);
    const analyzedLicenses = await analyzeLicenses(projects, config, PROJECT_DIR, true);
    onTestFailed(() => console.log(analyzedLicenses.items));
    expect(analyzedLicenses.error).toBe(false);
    expect(analyzedLicenses.items).toMatchInlineSnapshot(`
      [
        {
          "id": "dep-0-0.0.1",
          "license": "MIT",
          "licenseText": "The MIT License (MIT)
      TEST
      ",
          "name": "package-a",
          "noticeText": "",
          "version": "0.0.1",
        },
      ]
    `);
});

it("expect to find unallowed licenses", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const configPath = resolve(PROJECT_DIR, "license-config-missing.yaml");
    const projects = mockPnpmProjects();
    const config = readLicenseConfig(configPath);
    const analyzedLicenses = await analyzeLicenses(projects, config, PROJECT_DIR, true);

    expect(analyzedLicenses.error).toBe(true);

    expect(warnSpy).toHaveBeenCalled();
    onTestFailed(() => console.log(warnSpy.mock.calls));
    expect(
        warnSpy.mock.calls
            .flat()
            .some((arg) =>
                String(arg).includes(
                    "License 'MIT' of dependency 'package-a' (version: 0.0.1) is not allowed by configuration."
                )
            )
    ).toBe(true);
});

it("expect AND license expression to require every sub-license to be allowed", async () => {
    const configPath = resolve(PROJECT_DIR, "license-config.yaml");
    const projects = mockPnpmProjects("MIT AND Apache-2.0");
    const config = readLicenseConfig(configPath);
    const analyzedLicenses = await analyzeLicenses(projects, config, PROJECT_DIR, true);
    onTestFailed(() => console.log(analyzedLicenses.items));
    expect(analyzedLicenses.error).toBe(false);
    expect(analyzedLicenses.items[0]?.license).toBe("MIT AND Apache-2.0");
});

it("expect AND license expression to fail if one sub-license is not allowed", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const configPath = resolve(PROJECT_DIR, "license-config.yaml");
    const projects = mockPnpmProjects("MIT AND GPL-3.0-only");
    const config = readLicenseConfig(configPath);
    const analyzedLicenses = await analyzeLicenses(projects, config, PROJECT_DIR, true);

    expect(analyzedLicenses.error).toBe(true);
    onTestFailed(() => console.log(warnSpy.mock.calls));
    expect(
        warnSpy.mock.calls
            .flat()
            .some((arg) =>
                String(arg).includes(
                    "License 'MIT AND GPL-3.0-only' of dependency 'package-a' (version: 0.0.1) is not allowed by configuration."
                )
            )
    ).toBe(true);
});

it("expect OR license expression to pass if any alternative is allowed", async () => {
    const configPath = resolve(PROJECT_DIR, "license-config.yaml");
    const projects = mockPnpmProjects("(GPL-3.0-only OR MIT)");
    const config = readLicenseConfig(configPath);
    const analyzedLicenses = await analyzeLicenses(projects, config, PROJECT_DIR, true);
    onTestFailed(() => console.log(analyzedLicenses.items));
    expect(analyzedLicenses.error).toBe(false);
    expect(analyzedLicenses.items[0]?.license).toBe("(GPL-3.0-only OR MIT)");
});

it("expect OR license expression to fail if none of the alternatives are allowed", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const configPath = resolve(PROJECT_DIR, "license-config.yaml");
    const projects = mockPnpmProjects("(GPL-3.0-only OR ISC)");
    const config = readLicenseConfig(configPath);
    const analyzedLicenses = await analyzeLicenses(projects, config, PROJECT_DIR, true);

    expect(analyzedLicenses.error).toBe(true);
    onTestFailed(() => console.log(warnSpy.mock.calls));
    expect(
        warnSpy.mock.calls
            .flat()
            .some((arg) =>
                String(arg).includes(
                    "License '(GPL-3.0-only OR ISC)' of dependency 'package-a' (version: 0.0.1) is not allowed by configuration."
                )
            )
    ).toBe(true);
});

it("expect overrideLicenses to bypass expression evaluation entirely", async () => {
    const configPath = resolve(PROJECT_DIR, "license-config.yaml");
    const projects = mockPnpmProjects("(GPL-3.0-only OR ISC)");
    const config = readLicenseConfig(configPath);
    config.overrideLicenses = [{ name: "package-a", version: "0.0.1", license: "MIT" }];
    const analyzedLicenses = await analyzeLicenses(projects, config, PROJECT_DIR, true);

    onTestFailed(() => console.log(analyzedLicenses.items));
    expect(analyzedLicenses.error).toBe(false);
    expect(analyzedLicenses.items[0]?.license).toBe("MIT");
});

function mockPnpmProjects(license: string = "MIT"): PnpmLicenseProject[] {
    const licensePath = resolve(
        PROJECT_DIR,
        `node_modules/.pnpm/package-a@0.0.1/node_modules/package-a`
    );
    return [
        {
            name: "package-a",
            versions: ["0.0.1"],
            paths: [licensePath],
            license
        }
    ];
}
