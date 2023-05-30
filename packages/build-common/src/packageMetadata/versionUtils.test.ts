// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { canParse as canParse } from "./versionUtils";

describe("canParse", function () {
    it("supports older compatible versions", function () {
        const currentVersion = "1.2.3";
        expect(canParse(currentVersion, "1.0.0")).toBe(true);
        expect(canParse(currentVersion, "1.1.0")).toBe(true);
        expect(canParse(currentVersion, "1.1.123")).toBe(true);
        expect(canParse(currentVersion, "1.2.3")).toBe(true);
        expect(canParse(currentVersion, "0.1.0")).toBe(false);
    });

    it("supports newer patch versions", function () {
        const currentVersion = "1.2.3";
        expect(canParse(currentVersion, "1.2.4")).toBe(true);
        expect(canParse(currentVersion, "1.2.9999")).toBe(true);
    });

    it("does not support newer major or minor versions", function () {
        const currentVersion = "1.2.3";
        expect(canParse(currentVersion, "1.3.0")).toBe(false);
        expect(canParse(currentVersion, "2.0.0")).toBe(false);
    });

    it("throws for invalid versions", function () {
        // currentVersion comes from a constant and is assumed to be always valid, whereas serializedVersion comes from user input
        expect(() => canParse("1.0.0", "asd")).toThrowErrorMatchingInlineSnapshot(
            "\"Serialized metadata version is invalid: 'asd'. Expected a valid semver.\""
        );
        expect(() => canParse("asd", "1.2.3")).toThrowErrorMatchingInlineSnapshot(
            '"Internal error: invalid current version"'
        );
    });
});
