// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { expect, it, vi } from "vitest";
import { resolve } from "node:path";
import { TEST_DATA_DIR } from "./testing/paths";
import { getPnpmLicenseReport } from "./pnpm-license-report";

vi.setConfig({
    testTimeout: 20000
});

it("expect pnpm license to show right license", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "simple-project");
    const pnpmList = await getPnpmLicenseReport(packageDirectory, false, true);
    const pnpmArray = Object.values(pnpmList).flat();

    expect(pnpmArray).toContainEqual(
        expect.objectContaining({
            name: "typescript",
            versions: ["6.0.3"],
            license: "Apache-2.0"
        })
    );
    expect(pnpmArray).toHaveLength(1);
});

it("expect pnpm license to show right license with devDependencies", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "simple-project");
    const pnpmList = await getPnpmLicenseReport(packageDirectory, true, true);
    const pnpmArray = Object.values(pnpmList).flat();

    expect(pnpmArray).toContainEqual(
        expect.objectContaining({
            name: "typescript",
            versions: ["6.0.3"],
            license: "Apache-2.0"
        })
    );

    expect(pnpmArray).toContainEqual(
        expect.objectContaining({
            name: "@types/react",
            versions: ["19.2.14"],
            license: "MIT"
        })
    );

    expect(pnpmArray).toHaveLength(3); // csstype is an additional dependency of @types/react
});
