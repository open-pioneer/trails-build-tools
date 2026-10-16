// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";
import { parseVirtualModuleId, serializeModuleId } from "./shared";

it("serializes and parses the test support module without a locale", function () {
    const id = serializeModuleId({
        type: "test-support",
        packageDirectory: "/project/packages/pkg-a",
        locale: undefined
    });
    expect(id).toBe("/project/packages/pkg-a/@@open-pioneer-test-support");
    expect(parseVirtualModuleId(id)).toEqual({
        type: "test-support",
        packageDirectory: "/project/packages/pkg-a",
        locale: undefined
    });
});

it("serializes and parses the test support module with a locale", function () {
    const id = serializeModuleId({
        type: "test-support",
        packageDirectory: "/project/packages/pkg-a",
        locale: "de"
    });
    expect(id).toBe("/project/packages/pkg-a/@@open-pioneer-test-support?locale=de");
    expect(parseVirtualModuleId(id)).toEqual({
        type: "test-support",
        packageDirectory: "/project/packages/pkg-a",
        locale: "de"
    });
});
