// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { assert, describe, it } from "vitest";
import { IdGenerator } from "./IdGenerator";

describe("IdGenerator", function () {
    it("should replace non-representable characters", function () {
        const gen = new IdGenerator();
        assert.strictEqual(gen.generate("foo??bar_1#baz__2"), "foo_bar_1_baz");
        assert.strictEqual(gen.generate("1baz"), "_1baz");
    });

    it("should ensure uniqueness by adding counters", function () {
        const gen = new IdGenerator();
        assert.strictEqual(gen.generate("X"), "X");
        assert.strictEqual(gen.generate("X"), "X_1");
        assert.strictEqual(gen.generate("X"), "X_2");
    });
});
