// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from "vitest";
import { resolve } from "node:path";
import { PROJECT_DIR } from "./testing/paths";
import { readLicenseConfig } from "./license-config";
import { useTemporaryPnpmLockfile } from "./testing/helpers";

useTemporaryPnpmLockfile(PROJECT_DIR);

it("expect to read license config", async () => {
    const pathToConfig = resolve(PROJECT_DIR, "license-config.yaml");
    const config = readLicenseConfig(pathToConfig);

    expect(config).toMatchInlineSnapshot(`
      {
        "additionalLicenses": undefined,
        "allowedLicenses": [
          "Apache-2.0",
          "MIT",
        ],
        "overrideLicenses": undefined,
      }
    `);
});

it("expect to read license config with all attributes", async () => {
    const pathToConfig = resolve(PROJECT_DIR, "license-config-all.yaml");
    const config = readLicenseConfig(pathToConfig);

    expect(config).toMatchInlineSnapshot(`
      {
        "additionalLicenses": [
          {
            "license": "MIT",
            "licenseFiles": [
              {
                "path": "./licenses/package-c",
                "type": "custom",
              },
            ],
            "name": "package-c",
            "version": undefined,
          },
        ],
        "allowedLicenses": [
          "Apache-2.0",
          "MIT",
          "Unlicense",
        ],
        "overrideLicenses": [
          {
            "license": "Unlicense",
            "licenseFiles": undefined,
            "name": "package-b",
            "noticeFiles": undefined,
            "version": "0.0.1",
          },
        ],
      }
    `);
});
