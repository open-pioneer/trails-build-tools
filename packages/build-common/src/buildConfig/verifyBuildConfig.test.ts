// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { verifyBuildConfig } from "./verifyBuildConfig";

describe("verifyBuildConfigSchema", () => {
    it("allows valid values", () => {
        verifyBuildConfig({ styles: "foo" });
    });

    it("throws for invalid values", () => {
        const buildConfigResult = verifyBuildConfig({ styles: 2 });
        expect(buildConfigResult.type === "error").toBe(true);
        if (buildConfigResult.type === "error") {
            expect(buildConfigResult.message).toMatch(
                `Validation error: Expected string, received number at "styles"`
            );
        }
    });

    it("throws for invalid parameter names", () => {
        const buildConfigResult = verifyBuildConfig({ notValidParameterName: 2 });
        expect(buildConfigResult.type === "error").toBe(true);
        if (buildConfigResult.type === "error") {
            expect(buildConfigResult.message).toMatch(
                `Validation error: Unrecognized key(s) "notValidParameterName" in object`
            );
        }
    });
    it("throws for invalid runtime version", () => {
        const buildConfigResult = verifyBuildConfig({ appRuntimeMetadataversion: "127.0.0.1" });
        expect(buildConfigResult.type === "error").toBe(true);
        if (buildConfigResult.type === "error") {
            expect(buildConfigResult.message).toMatch(
                `Cannot determine support status of framework metadata version 127.0.0.1.`
            );
        }
    });
});
