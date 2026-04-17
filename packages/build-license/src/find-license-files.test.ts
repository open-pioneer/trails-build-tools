// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";
import { resolve } from "node:path";
import { TEST_DATA_DIR } from "./testing/paths";
import { findFirstLicenseFile } from "./find-license-files";

it("expect pnpm license to show right license", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "simple-project");

    const fileSpec = findFirstLicenseFile(packageDirectory);
    expect(fileSpec).toMatchInlineSnapshot(`
      [
        {
          "path": "license-config-all.yaml",
          "type": "package",
        },
      ]
    `);
});
