// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { isRuntimeVersion } from "./isRuntimeVersion";

describe("isRuntimeVersion", function () {
    it("accepts right runtime versions", async function () {
        const v1 = "1.0.0";
        const v2 = "2.0.0";
        const v3 = "3.0.0";
        const test = { value: "1.0.0" };
        expect(isRuntimeVersion(v1)).toEqual(true);
        expect(isRuntimeVersion(v2)).toEqual(true);
        expect(isRuntimeVersion(v3)).toEqual(false);
        expect(isRuntimeVersion(test)).toEqual(false);
    });
});
