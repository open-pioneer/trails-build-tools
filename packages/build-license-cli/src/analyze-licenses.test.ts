// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, expect, it, onTestFailed, vi } from "vitest";
import { resolve } from "node:path";
import { TEST_DATA_DIR } from "./testing/paths";
import { getPnpmLicenseReport } from "./pnpm-license-report";
import { readLicenseConfig } from "./license-config";
import { analyzeLicenses } from "./analyze-licenses";
import { cpSync } from "node:fs";

vi.setConfig({
    testTimeout: 20000
});
beforeAll(() => {
    const packageDirectory = resolve(TEST_DATA_DIR, "simple-project");
    const sourceLockfile = resolve(packageDirectory, "_pnpm-lock.yaml");
    cpSync(sourceLockfile, resolve(packageDirectory, "pnpm-lock.yaml"), { recursive: true });
});

it("expect to analyze the dependencies", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "simple-project");
    const configPath = resolve(packageDirectory, "license-config.yaml");
    const pnpmList = await getPnpmLicenseReport(packageDirectory, false, true);
    const config = readLicenseConfig(configPath);
    const analyzedLicenses = await analyzeLicenses(pnpmList, config, packageDirectory, true);
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

    const packageDirectory = resolve(TEST_DATA_DIR, "simple-project");
    const configPath = resolve(packageDirectory, "license-config-missing.yaml");
    const pnpmList = await getPnpmLicenseReport(packageDirectory, false, true);
    const config = readLicenseConfig(configPath);
    const analyzedLicenses = await analyzeLicenses(pnpmList, config, packageDirectory, true);

    expect(analyzedLicenses.error).toBe(true);

    expect(warnSpy).toHaveBeenCalled();
    console.log(warnSpy.mock.calls);
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
