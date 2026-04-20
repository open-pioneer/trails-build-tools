// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { expect, it, onTestFailed, vi } from "vitest";
import { resolve } from "node:path";
import { PROJECT_DIR } from "./testing/paths";
import { PnpmLicensesReport } from "./pnpm-license-report";
import { readLicenseConfig } from "./license-config";
import { analyzeLicenses } from "./analyze-licenses";

it("expect to analyze the dependencies", async () => {
    const configPath = resolve(PROJECT_DIR, "license-config.yaml");
    const pnpmList = mockPnpmLicenseReport();
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
    const pnpmList = mockPnpmLicenseReport();
    const config = readLicenseConfig(configPath);
    const analyzedLicenses = await analyzeLicenses(pnpmList, config, PROJECT_DIR, true);

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

function mockPnpmLicenseReport(): PnpmLicensesReport {
    const licensePath = resolve(
        PROJECT_DIR,
        `node_modules/.pnpm/package-a@0.0.1/node_modules/package-a`
    );
    return {
        MIT: [
            {
                name: "package-a",
                versions: ["0.0.1"],
                paths: [licensePath],
                license: "MIT"
            }
        ]
    };
}
