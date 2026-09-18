// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { resolve } from "node:path";
import { expect, it } from "vitest";
import { readLicenseConfig } from "./readLicenseConfig";
import { PROJECT_DIR } from "./testing/paths";

it("applies defaults for missing optional entries", () => {
    const config = readLicenseConfig(resolve(PROJECT_DIR, "license-config.yaml"));
    expect(config).toMatchInlineSnapshot(`
      {
        "additionalLicenses": undefined,
        "allowedLicenses": [
          "Apache-2.0",
          "MIT",
        ],
        "overrideLicenses": undefined,
        "skipDevDependencies": true,
      }
    `);
});

it("reads a config with all entries", () => {
    const config = readLicenseConfig(resolve(PROJECT_DIR, "license-config-all.yaml"));
    expect(config).toMatchInlineSnapshot(`
      {
        "additionalLicenses": [
          {
            "license": "Apache-2.0",
            "licenseFiles": [
              {
                "path": "./licenses/package-c",
                "type": "custom",
              },
            ],
            "name": "package-c",
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
            "name": "package-b",
            "version": "0.0.1",
          },
        ],
        "skipDevDependencies": false,
      }
    `);
});

it("rejects an invalid config", () => {
    expect(() => readLicenseConfig(resolve(PROJECT_DIR, "license-config-invalid.yaml"))).toThrow(
        /allowedLicenses/
    );
});
