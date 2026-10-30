// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { assert, it } from "vitest";
import { defineQuery, QUERY_INTERNALS } from "./defineQuery";

it("stores the name and the query function", async function () {
    const query = async () => 42;
    const Answer = defineQuery<undefined, number>({ name: "Answer", query });
    assert.strictEqual(Answer.name, "Answer");
    assert.strictEqual(Answer[QUERY_INTERNALS].query, query);
});

it("compares values structurally by default", function () {
    const Query = defineQuery<undefined, { items: number[]; map: Map<string, number> }>({
        name: "Query",
        async query() {
            return { items: [], map: new Map() };
        }
    });

    const equals = Query[QUERY_INTERNALS].equals;
    assert.isTrue(
        equals({ items: [1], map: new Map([["a", 1]]) }, { items: [1], map: new Map([["a", 1]]) })
    );
    assert.isFalse(equals({ items: [1], map: new Map() }, { items: [2], map: new Map() }));
});

it("uses a custom equals when given", function () {
    const SameLength = defineQuery<undefined, string>({
        name: "SameLength",
        async query() {
            return "";
        },
        equals: (a, b) => a.length === b.length
    });

    const equals = SameLength[QUERY_INTERNALS].equals;
    assert.isTrue(equals("ab", "cd"));
    assert.isFalse(equals("ab", "c"));
});
