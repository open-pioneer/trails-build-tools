// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { canSupportAsReader as supportsAsReader } from "./compatibility";

describe("SerializedMetadataV1", function () {
    it("supports older compatible versions", function () {
        const currentVersion = "1.2.3";
        expect(supportsAsReader(currentVersion, "1.0.0")).toBe(true);
        expect(supportsAsReader(currentVersion, "1.1.0")).toBe(true);
        expect(supportsAsReader(currentVersion, "1.1.123")).toBe(true);
        expect(supportsAsReader(currentVersion, "1.2.3")).toBe(true);
        expect(supportsAsReader(currentVersion, "0.1.0")).toBe(false);
    });

    it("supports newer patch versions", function () {
        const currentVersion = "1.2.3";
        expect(supportsAsReader(currentVersion, "1.2.4")).toBe(true);
        expect(supportsAsReader(currentVersion, "1.2.9999")).toBe(true);
        expect(supportsAsReader(currentVersion, "1.3.0")).toBe(false);
    });

    it("does not support newer major versions", function () {
        const currentVersion = "1.2.3";
        expect(supportsAsReader(currentVersion, "2.0.0")).toBe(false);
    });
});
