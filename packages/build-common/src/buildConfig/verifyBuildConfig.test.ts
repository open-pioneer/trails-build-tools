// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { assert, describe, it } from "vitest";
import { verifyBuildConfig } from "./verifyBuildConfig";

describe("verifyBuildConfigSchema", () => {
    it("allows valid values", () => {
        verifyBuildConfig({ styles: "foo" });
    });

    it("throws for invalid values", () => {
        assert.throws(() => verifyBuildConfig({ styles: 2 }), /Expected string, received number/);
    });

    it("throws for invalid parameter names", () => {
        assert.throws(
            () => verifyBuildConfig({ notValidParameterName: 2 }),
            /Unrecognized key\(s\) in object: 'notValidParameterName'/
        );
    });
});
