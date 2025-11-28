// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from "vitest";

// @ts-expect-error import of non-module happens to work in vitest (pnpmfile must be CJS)
import pnpmFile from "../src/pnpmfile";

it("applies default config options to user config", () => {
    const userConfig = {
        catalog: {} // not overwritten
    };
    const updatedConfig = pnpmFile.hooks.updateConfig(userConfig);
    expect(updatedConfig).toMatchInlineSnapshot(`
      {
        "allowUnusedPatches": true,
        "catalog": {},
        "ignorePatchFailures": false,
        "linkWorkspacePackages": false,
        "minimumReleaseAge": 4320,
        "minimumReleaseAgeExclude": [
          "@open-pioneer/*",
          "@conterra/*",
        ],
        "resolutionMode": "time-based",
        "strictPeerDependencies": true,
      }
    `);
});
