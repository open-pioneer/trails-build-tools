// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { getExportedName, normalizeEntryPoints } from "./entryPoints";

const EXTS = [".js", ".ts"];

describe("normalizeEntryPoints", function () {
    it("normalizes valid entry point specifiers", function () {
        const rawEntryPoints = [
            "./index",
            "foo",
            "./foo/bar123",
            "foo/bar/baz",
            "bar.ts",
            "./foo/bar.js"
        ];
        const normalized = normalizeEntryPoints(rawEntryPoints, EXTS);
        expect(normalized).toMatchInlineSnapshot(`
          [
            {
              "inputModulePath": "./index",
              "outputModuleId": "index",
            },
            {
              "inputModulePath": "./foo",
              "outputModuleId": "foo",
            },
            {
              "inputModulePath": "./foo/bar123",
              "outputModuleId": "foo/bar123",
            },
            {
              "inputModulePath": "./foo/bar/baz",
              "outputModuleId": "foo/bar/baz",
            },
            {
              "inputModulePath": "./bar.ts",
              "outputModuleId": "bar",
            },
            {
              "inputModulePath": "./foo/bar.js",
              "outputModuleId": "foo/bar",
            },
          ]
        `);
    });

    it("throws if an extension is not supported", function () {
        const entryPoints = ["foo.bar"];
        expect(() => normalizeEntryPoints(entryPoints, EXTS)).toThrowErrorMatchingInlineSnapshot(
            `[Error: The extension '.bar' is not supported (entry point 'foo.bar').]`
        );
    });

    it("throws for bad entry point paths", function () {
        const entryPoints = ["../index"];
        expect(() => normalizeEntryPoints(entryPoints, EXTS)).toThrowErrorMatchingInlineSnapshot(
            `[Error: Entry point '../index' does not appear like a valid module id.]`
        );
    });

    it("throws if entry module is specified twice", function () {
        const entryPoints = ["index", "./index.ts"];
        expect(() => normalizeEntryPoints(entryPoints, EXTS)).toThrowErrorMatchingInlineSnapshot(
            `[Error: Entry point 'index' is specified twice.]`
        );
    });
});

describe("getExportedName", function () {
    it("returns the expected exported name", function () {
        expect(getExportedName("index")).toBe("");
        expect(getExportedName("foo")).toBe("foo");
        expect(getExportedName("foo/bar/baz")).toBe("foo/bar/baz");
        expect(getExportedName("foo/bar/index")).toBe("foo/bar");
    });
});
