// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { assert, expect, it } from "vitest";
import { canonicalJson } from "./canonicalJson";

it("serializes JSON data with sorted keys", function () {
    assert.strictEqual(
        canonicalJson({ b: [{ z: 1, y: null }], a: "x" }),
        '{"a":"x","b":[{"y":null,"z":1}]}'
    );
    assert.strictEqual(canonicalJson(Object.create(null)), "{}");
    assert.strictEqual(canonicalJson({ skipped: undefined }), "{}");
    assert.strictEqual(canonicalJson([undefined, 1]), "[null,1]");
});

it("rejects values that are not plain JSON data", function () {
    expect(() => canonicalJson({ fn() {} })).toThrow(/got a function/);
    expect(() => canonicalJson({ date: new Date(0) })).toThrow(/got an instance of Date/);
    expect(() => canonicalJson({ value: Infinity })).toThrow(/got Infinity/);
    expect(() => canonicalJson(Symbol("x"))).toThrow(/got a symbol/);
});
