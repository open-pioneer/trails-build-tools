// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "path";
import { expect, it } from "vitest";
import { TEST_DATA_DIR } from "../utils/testUtils";
import { findTrailsPackages } from "./findTrailsPackages";
import { PackageMetadata } from "./Metadata";

it("finds local trails packages", async () => {
    const sourceRoot = resolve(TEST_DATA_DIR, "codegen-packages");
    const packages = await findTrailsPackages(sourceRoot);
    expect(getPackageInfo(packages)).toMatchInlineSnapshot(`
      [
        {
          "name": "logging",
          "services": "logging/customServices",
        },
        {
          "name": "test-app",
          "services": "test-app/services",
        },
      ]
    `);
});

it("finds external packages via node modules", async () => {
    const sourceRoot = resolve(TEST_DATA_DIR, "codegen-packages-external/src");
    const packages = await findTrailsPackages(sourceRoot);

    // ol-map is not in the "src" directory
    expect(getPackageInfo(packages)).toMatchInlineSnapshot(`
      [
        {
          "name": "ol-map",
          "services": "ol-map/my-services",
        },
        {
          "name": "test-app",
          "services": "test-app/services",
        },
      ]
    `);
});

function getPackageInfo(packages: PackageMetadata[]) {
    return packages.map((p) => {
        return {
            name: p.name,
            services: p.servicesModuleId
        };
    });
}
