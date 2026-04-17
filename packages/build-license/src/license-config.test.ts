// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";
import { resolve } from "node:path";
import { TEST_DATA_DIR } from "./testing/paths";
import { readLicenseConfig } from "./license-config";

it("expect to read license config", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "simple-project");
    const pathToConfig = resolve(packageDirectory, "license-config.yaml");
    const config = readLicenseConfig(pathToConfig);

    expect(config).toMatchInlineSnapshot(`
      {
        "additionalLicenses": undefined,
        "allowedLicenses": [
          "Apache-2.0",
          "MIT",
          "ISC",
          "BSD-3-Clause",
          "BSD-2-Clause",
          "0BSD",
          "CC0-1.0",
          "WTFPL",
          "Unlicense",
        ],
        "overrideLicenses": undefined,
      }
    `);
});

it("expect to read license config with all attributes", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "simple-project");
    const pathToConfig = resolve(packageDirectory, "license-config-all.yaml");
    const config = readLicenseConfig(pathToConfig);

    expect(config).toMatchInlineSnapshot(`
      {
        "additionalLicenses": [
          {
            "license": "MIT",
            "licenseFiles": [
              {
                "path": "./licenses/feather_mit",
                "type": "custom",
              },
            ],
            "name": "Feather",
            "version": undefined,
          },
        ],
        "allowedLicenses": [
          "Apache-2.0",
          "MIT",
          "ISC",
          "BSD-3-Clause",
          "BSD-2-Clause",
          "0BSD",
          "CC0-1.0",
          "WTFPL",
          "Unlicense",
        ],
        "overrideLicenses": [
          {
            "license": "Unlicense",
            "licenseFiles": undefined,
            "name": "fast-shallow-equal",
            "noticeFiles": undefined,
            "version": "1.0.0",
          },
        ],
      }
    `);
});
