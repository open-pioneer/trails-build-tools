// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { verifyBuildConfig } from "./verifyBuildConfig";

describe("verifyBuildConfigSchema", () => {
    it("allows valid values", () => {
        verifyBuildConfig({ styles: "foo" });
    });

    it("throws for invalid values", () => {
        expect(() => verifyBuildConfig({ styles: 2 })).toThrowErrorMatchingInlineSnapshot(
            `[ZodValidationError: Validation error: Expected string, received number at "styles"]`
        );
    });

    it("throws for invalid parameter names", () => {
        expect(() =>
            verifyBuildConfig({ notValidParameterName: 2 })
        ).toThrowErrorMatchingInlineSnapshot(
            `[ZodValidationError: Validation error: Unrecognized key(s) "notValidParameterName" in object]`
        );
    });
});
