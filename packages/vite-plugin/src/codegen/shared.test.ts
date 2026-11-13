// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";
import {
    parseVirtualModuleId,
    serializeModuleId,
    serializeOptimizedVirtualModuleId
} from "./shared";

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

it("serializes and parses the assets module of a package", function () {
    const id = serializeModuleId({
        type: "package-assets",
        packageDirectory: "/project/packages/pkg-a"
    });
    expect(id).toBe("/project/packages/pkg-a/@@open-pioneer-assets");
    expect(parseVirtualModuleId(id)).toEqual({
        type: "package-assets",
        packageDirectory: "/project/packages/pkg-a"
    });
});

it("serializes and parses the assets module of an optimized dependency", function () {
    const id = serializeOptimizedVirtualModuleId({
        kind: "package-assets",
        packageDirectory: "/project/node_modules/pkg-a"
    });
    expect(id).toBe("\0open-pioneer:package-assets:/project/node_modules/pkg-a");
    expect(parseVirtualModuleId(id)).toEqual({
        type: "package-assets",
        packageDirectory: "/project/node_modules/pkg-a"
    });
});
