// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { expect, it, onTestFailed, vi } from "vitest";
import { resolve } from "node:path";
import { PROJECT_DIR } from "./testing/paths";
import { getPnpmLicenseReport } from "./pnpm-license-report";
import { readLicenseConfig } from "./license-config";
import { analyzeLicenses } from "./analyze-licenses";
import { useTemporaryPnpmLockfile } from "./testing/helpers";

useTemporaryPnpmLockfile(PROJECT_DIR);

it("expect to analyze the dependencies", async () => {
    const configPath = resolve(PROJECT_DIR, "license-config.yaml");
    const pnpmList = await getPnpmLicenseReport(PROJECT_DIR, false, true);
    const config = readLicenseConfig(configPath);
    const analyzedLicenses = await analyzeLicenses(pnpmList, config, PROJECT_DIR, true);
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
    const pnpmList = await getPnpmLicenseReport(PROJECT_DIR, false, true);
    const config = readLicenseConfig(configPath);
    const analyzedLicenses = await analyzeLicenses(pnpmList, config, PROJECT_DIR, true);

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
