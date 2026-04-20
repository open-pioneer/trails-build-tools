// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { expect, it, onTestFailed, vi } from "vitest";
import { PROJECT_DIR } from "./testing/paths";
import { getPnpmLicenseReport } from "./pnpm-license-report";
import { useTemporaryPnpmLockfile } from "./testing/helpers";

useTemporaryPnpmLockfile(PROJECT_DIR);

it("expect pnpm license to show right license", async () => {
    const pnpmList = await getPnpmLicenseReport(PROJECT_DIR, false, true);
    const pnpmArray = Object.values(pnpmList).flat();
    onTestFailed(() => console.log(pnpmArray));
    expect(pnpmArray).toContainEqual(
        expect.objectContaining({
            name: "package-a",
            versions: ["0.0.1"],
            license: "MIT"
        })
    );
    expect(pnpmArray).toHaveLength(1);
});

it("expect pnpm license to show right license with devDependencies", async () => {
    const pnpmList = await getPnpmLicenseReport(PROJECT_DIR, true, true);
    const pnpmArray = Object.values(pnpmList).flat();
    onTestFailed(() => console.log(pnpmArray));

    expect(pnpmArray).toContainEqual(
        expect.objectContaining({
            name: "package-a",
            versions: ["0.0.1"],
            license: "MIT"
        })
    );

    expect(pnpmArray).toContainEqual(
        expect.objectContaining({
            name: "package-b",
            versions: ["0.0.1"],
            license: "Apache-2.0"
        })
    );

    expect(pnpmArray).toHaveLength(2);
});
