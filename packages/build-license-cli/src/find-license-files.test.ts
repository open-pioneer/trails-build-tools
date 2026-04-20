// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from "vitest";
import { PROJECT_DIR } from "./testing/paths";
import { findFirstLicenseFile } from "./find-license-files";

it("expect to  find a license config file", async () => {
    const fileSpec = findFirstLicenseFile(PROJECT_DIR);
    expect(fileSpec).toMatchInlineSnapshot(`
      [
        {
          "path": "license-config-all.yaml",
          "type": "package",
        },
      ]
    `);
});
