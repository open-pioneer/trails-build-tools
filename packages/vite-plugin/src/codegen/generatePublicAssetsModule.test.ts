// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";
import { generatePublicAssetsModule } from "./generatePublicAssetsModule";

it("derives the asset urls from the base url", function () {
    const code = generatePublicAssetsModule("packages/scope~name/");
    expect(code).toMatchInlineSnapshot(`
      "import { baseUrl } from "open-pioneer:deployment";

      export const publicAssetsUrl = new URL("packages/scope~name/", baseUrl).href;
      export function getPublicAssetUrl(localAssetPath) {
          return new URL(localAssetPath, publicAssetsUrl).href;
      }"
    `);
});

it("throws for a package directory without a trailing slash", function () {
    expect(() => generatePublicAssetsModule("packages/scope~name")).toThrow(
        "The package directory must end with '/'"
    );
});
