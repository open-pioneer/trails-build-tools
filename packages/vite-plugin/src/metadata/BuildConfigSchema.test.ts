// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { assert, describe, it } from "vitest";
import { verifyBuildConfigSchema } from "./BuildConfigSchema";

describe("BuildConfigSchema", () => {
    it("allows valid values", () => {
        verifyBuildConfigSchema({ styles: "foo" });
    });

    it("throws for invalid values", () => {
        assert.throws(
            () => verifyBuildConfigSchema({ styles: 2 }),
            /Expected string, received number/
        );
    });

    it("throws for invalid parameter names", () => {
        assert.throws(
            () => verifyBuildConfigSchema({ notValidParameterName: 2 }),
            /Unrecognized key\(s\) in object: 'notValidParameterName'/
        );
    });
});
