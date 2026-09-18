// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { resolve } from "node:path";
import { expect, it } from "vitest";
import { findFirstLicenseFile, findFirstNoticeFile } from "./findLicenseFiles";
import { TEST_DATA_DIR } from "./testing/paths";

it("finds a plain LICENSE file", () => {
    expect(findFirstLicenseFile(getTestFixtureDir("plain-license"))).toEqual([
        { type: "package", path: "LICENSE" }
    ]);
});

it("finds a license file with an extension", () => {
    expect(findFirstLicenseFile(getTestFixtureDir("license-with-extension"))).toEqual([
        { type: "package", path: "LICENSE.md" }
    ]);
});

it("picks the first license file of a dual licensed package", () => {
    expect(findFirstLicenseFile(getTestFixtureDir("dual-license"))).toEqual([
        { type: "package", path: "LICENSE-APACHE.txt" }
    ]);
});

it("ignores files that only contain the word license in their name", () => {
    expect(findFirstLicenseFile(getTestFixtureDir("no-license"))).toEqual([]);
});

it("finds a NOTICE file", () => {
    expect(findFirstNoticeFile(getTestFixtureDir("with-notice"))).toEqual([
        { type: "package", path: "NOTICE" }
    ]);
    expect(findFirstNoticeFile(getTestFixtureDir("plain-license"))).toEqual([]);
});

function getTestFixtureDir(name: string): string {
    return resolve(TEST_DATA_DIR, "license-files", name);
}
