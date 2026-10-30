// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { assert, describe, expect, it } from "vitest";
import { defineQuery, QueryContext } from "./defineQuery";
import { QUERY_DB_INTERNALS, QueryDb } from "./QueryDb";

describe("caching", function () {
    it("runs the query once and returns the stored value afterwards", async function () {
        let calls = 0;
        const Double = defineQuery<{ value: number }, number>({
            name: "Double",
            async query(_ctx, params) {
                calls += 1;
                return params.value * 2;
            }
        });

        const db = createDb();
        assert.strictEqual(await db.get(Double, { value: 2 }), 4);
        assert.strictEqual(await db.get(Double, { value: 2 }), 4);
        assert.strictEqual(calls, 1);

        assert.strictEqual(await db.get(Double, { value: 3 }), 6);
        assert.strictEqual(calls, 2);
    });

    it("treats structurally equal params as the same key", async function () {
        interface Params {
            a: string;
            b: string;
            nested: { x: number[] };
        }

        let calls = 0;
        const Concat = defineQuery<Params, string>({
            name: "Concat",
            async query(_ctx, params) {
                calls += 1;
                return params.a + params.b + params.nested.x.join(",");
            }
        });

        const db = createDb();
        const value1 = await db.get(Concat, { a: "1", b: "2", nested: { x: [3, 4] } });
        const value2 = await db.get(Concat, { nested: { x: [3, 4] }, b: "2", a: "1" });
        assert.strictEqual(value1, "123,4");
        assert.strictEqual(value2, value1);
        assert.strictEqual(calls, 1);

        await db.get(Concat, { a: "1", b: "2", nested: { x: [4, 3] } });
        assert.strictEqual(calls, 2);
    });

    it("keeps entries of different queries apart", async function () {
        interface Params {
            value: number;
        }
        const Inc = defineQuery<Params, number>({
            name: "Inc",
            query: async (_ctx, params) => params.value + 1
        });
        const Dec = defineQuery<Params, number>({
            name: "Dec",
            query: async (_ctx, params) => params.value - 1
        });

        const db = createDb();
        assert.strictEqual(await db.get(Inc, { value: 1 }), 2);
        assert.strictEqual(await db.get(Dec, { value: 1 }), 0);
    });

    it("returns a promise for a stored value", async function () {
        const Constant = defineQuery({
            name: "Constant",
            query: async () => "x"
        });

        const db = createDb();
        await db.get(Constant, null);
        const result = db.get(Constant, null);
        assert.instanceOf(result, Promise);
        assert.strictEqual(await result, "x");
    });

    it("rejects params that are not plain JSON data", async function () {
        const Any = defineQuery<never, void>({
            name: "Any",
            async query() {}
        });

        const db = createDb();
        await expect(db.get(Any, { fn() {} } as never)).rejects.toThrow(/got a function/);
        await expect(db.get(Any, { date: new Date(0) } as never)).rejects.toThrow(
            /got an instance of Date/
        );
        await expect(db.get(Any, { value: Infinity } as never)).rejects.toThrow(/got Infinity/);
    });
});

describe("failures", function () {
    it("stores a failure and rethrows the same error object", async function () {
        let calls = 0;
        const error = new Error("boom");
        const Failing = defineQuery({
            name: "Failing",
            async query() {
                calls += 1;
                throw error;
            }
        });

        const db = createDb();
        await expect(db.get(Failing, null)).rejects.toBe(error);
        await expect(db.get(Failing, null)).rejects.toBe(error);
        assert.strictEqual(calls, 1);
    });

    it("delivers a failure to every waiter of a running computation", async function () {
        const deferred = createDeferred<never>();
        const Failing = defineQuery({
            name: "Failing",
            query: () => deferred.promise
        });

        const db = createDb();
        const first = db.get(Failing, null);
        const second = db.get(Failing, null);
        const error = new Error("boom");
        deferred.reject(error);
        await expect(first).rejects.toBe(error);
        await expect(second).rejects.toBe(error);
    });

    it("rethrows the original error of a failed input", async function () {
        const error = new Error("leaf failed");
        const Leaf = defineQuery<null, never>({
            name: "Leaf",
            async query() {
                throw error;
            }
        });
        let seen: unknown;
        const Parent = defineQuery<null, string>({
            name: "Parent",
            async query(ctx) {
                try {
                    return await ctx.get(Leaf, null);
                } catch (e) {
                    seen = e;
                    throw e;
                }
            }
        });

        const db = createDb();
        await expect(db.get(Parent, null)).rejects.toBe(error);
        assert.strictEqual(seen, error);
        await expect(db.get(Leaf, null)).rejects.toBe(error);
    });
});

describe("concurrent reads", function () {
    it("joins a running computation instead of starting a second one", async function () {
        let calls = 0;
        const deferred = createDeferred<string>();
        const Slow = defineQuery<{ id: number }, string>({
            name: "Slow",
            query() {
                calls += 1;
                return deferred.promise;
            }
        });

        const db = createDb();
        const first = db.get(Slow, { id: 1 });
        const second = db.get(Slow, { id: 1 });
        await tick();
        assert.strictEqual(calls, 1);

        deferred.resolve("value");
        assert.strictEqual(await first, "value");
        assert.strictEqual(await second, "value");
        assert.strictEqual(await db.get(Slow, { id: 1 }), "value");
        assert.strictEqual(calls, 1);
    });

    it("lets readers run concurrently for different keys", async function () {
        const deferreds = new Map<number, Deferred<number>>();
        const Slow = defineQuery<{ id: number }, number>({
            name: "Slow",
            query(_ctx, params) {
                const deferred = createDeferred<number>();
                deferreds.set(params.id, deferred);
                return deferred.promise;
            }
        });

        const db = createDb();
        const first = db.get(Slow, { id: 1 });
        const second = db.get(Slow, { id: 2 });
        await tick();
        assert.deepEqual([...deferreds.keys()], [1, 2]);

        deferreds.get(2)?.resolve(20);
        assert.strictEqual(await second, 20);
        deferreds.get(1)?.resolve(10);
        assert.strictEqual(await first, 10);
    });

    it("lets two queries join the running computation of a shared input", async function () {
        let leafCalls = 0;
        const deferred = createDeferred<number>();
        const Leaf = defineQuery<null, number>({
            name: "Leaf",
            query() {
                leafCalls += 1;
                return deferred.promise;
            }
        });
        const Parent = defineQuery<{ factor: number }, number>({
            name: "Parent",
            query: async (ctx, params) => (await ctx.get(Leaf, null)) * params.factor
        });

        const db = createDb();
        const first = db.get(Parent, { factor: 1 });
        const second = db.get(Parent, { factor: 2 });
        await tick();
        assert.strictEqual(leafCalls, 1);

        deferred.resolve(5);
        assert.deepEqual(await Promise.all([first, second]), [5, 10]);
    });
});

describe("clear", function () {
    it("forgets stored values on clear", async function () {
        let calls = 0;
        const Counter = defineQuery({
            name: "Counter",
            async query() {
                calls += 1;
                return calls;
            }
        });

        const db = createDb();
        assert.strictEqual(await db.get(Counter, null), 1);
        db.clear();
        assert.strictEqual(await db.get(Counter, null), 2);
    });

    it("does not store the result of a computation that was running during clear", async function () {
        let calls = 0;
        const deferred = createDeferred<number>();
        const Slow = defineQuery({
            name: "Slow",
            async query() {
                calls += 1;
                return calls === 1 ? deferred.promise : "new-run";
            }
        });

        const db = createDb();
        const first = db.get(Slow, null);
        await tick();
        db.clear();
        deferred.resolve(100);
        assert.strictEqual(await first, 100);

        assert.strictEqual(await db.get(Slow, null), "new-run");
        assert.strictEqual(calls, 2);
    });
});

describe("query context", function () {
    it("exposes the host on the context", async function () {
        let seenHost: unknown;
        const ReadHost = defineQuery<null, void>({
            name: "ReadHost",
            async query(ctx) {
                seenHost = ctx.host;
            }
        });

        const host = { marker: "host" };
        const db = new QueryDb({ host });
        await db.get(ReadHost, null);
        assert.strictEqual(seenHost, host);
    });

    it("reads other queries through the context and records them as inputs", async function () {
        let leafCalls = 0;
        const Leaf = defineQuery<{ id: number }, number>({
            name: "Leaf",
            async query(_ctx, params) {
                leafCalls += 1;
                return params.id * 10;
            }
        });
        const Sum = defineQuery<{ ids: number[] }, number>({
            name: "Sum",
            async query(ctx, params) {
                let sum = 0;
                for (const id of params.ids) {
                    sum += await ctx.get(Leaf, { id });
                }
                return sum;
            }
        });

        const db = createDb();
        assert.strictEqual(await db.get(Sum, { ids: [2, 1] }), 30);
        assert.strictEqual(await db.get(Sum, { ids: [1] }), 10);
        assert.strictEqual(leafCalls, 2);

        const inputs = db[QUERY_DB_INTERNALS].getInputs;
        assert.deepEqual(inputs(Sum, { ids: [2, 1] }), ['Leaf({"id":2})', 'Leaf({"id":1})']);
        assert.deepEqual(inputs(Sum, { ids: [1] }), ['Leaf({"id":1})']);
        assert.deepEqual(inputs(Leaf, { id: 1 }), []);
        assert.isUndefined(inputs(Leaf, { id: 3 }));
    });

    it("records inputs requested with Promise.all in call-start order", async function () {
        const deferreds = [createDeferred<string>(), createDeferred<string>()];
        const Leaf = defineQuery<{ index: number }, string>({
            name: "Leaf",
            query: (_ctx, params) => deferreds[params.index]?.promise ?? Promise.reject()
        });
        const Both = defineQuery<null, string>({
            name: "Both",
            async query(ctx) {
                const values = await Promise.all([
                    ctx.get(Leaf, { index: 0 }),
                    ctx.get(Leaf, { index: 1 })
                ]);
                return values.join("+");
            }
        });

        const db = createDb();
        const result = db.get(Both, null);
        await tick();
        deferreds[1]?.resolve("b");
        deferreds[0]?.resolve("a");
        assert.strictEqual(await result, "a+b");
        assert.deepEqual(db[QUERY_DB_INTERNALS].getInputs(Both, null), [
            'Leaf({"index":0})',
            'Leaf({"index":1})'
        ]);
    });

    it("rejects context methods that are not implemented yet", async function () {
        const calls: Array<(ctx: QueryContext) => unknown> = [
            (ctx) => ctx.readFile("/x" as never),
            (ctx) => ctx.fileExists("/x" as never),
            (ctx) => ctx.watchFile("/x" as never),
            (ctx) => ctx.warn("x")
        ];

        for (const [index, call] of calls.entries()) {
            const Caller = defineQuery<{ index: number }, unknown>({
                name: "Caller",
                query: async (ctx) => call(ctx)
            });
            const db = createDb();
            await expect(db.get(Caller, { index })).rejects.toThrow(/is not implemented yet/);
        }
    });
});

describe("context guards", function () {
    it("rejects QueryDb.get inside a query", async function () {
        const Leaf = defineQuery<null, number>({
            name: "Leaf",
            query: async () => 1
        });
        const db = createDb();
        const Bypass = defineQuery<{ id: number }, number>({
            name: "Bypass",
            query: () => db.get(Leaf, null)
        });

        await expect(db.get(Bypass, { id: 1 })).rejects.toThrow(
            'QueryDb.get was called inside the query Bypass({"id":1})'
        );
    });

    it("rejects a context used from another query", async function () {
        let captured: QueryContext | undefined;
        const release = createDeferred<void>();
        const Capture = defineQuery<null, void>({
            name: "Capture",
            async query(ctx) {
                captured = ctx;
                await release.promise;
            }
        });
        const Leaf = defineQuery<null, number>({
            name: "Leaf",
            query: async () => 1
        });
        const Thief = defineQuery<null, number>({
            name: "Thief",
            query: () => captured?.get(Leaf, null) ?? Promise.reject(new Error("not captured"))
        });

        const db = createDb();
        const capture = db.get(Capture, null);
        await tick();
        await expect(db.get(Thief, null)).rejects.toThrow(
            "QueryContext.get of Capture(null) was called outside of its computation."
        );

        release.resolve();
        await capture;
    });

    it("rejects a context used after its computation finished", async function () {
        let captured: QueryContext | undefined;
        let lateCall: Promise<unknown> | undefined;
        const Capture = defineQuery<null, void>({
            name: "Capture",
            async query(ctx) {
                captured = ctx;
                lateCall = new Promise((resolve) => {
                    setTimeout(() => resolve(ctx.get(Capture, null)), 0);
                });
            }
        });

        const db = createDb();
        await db.get(Capture, null);
        const message =
            "QueryContext.get was called after the computation of Capture(null) finished.";
        await expect(lateCall).rejects.toThrow(message);
        await expect(captured?.get(Capture, null)).rejects.toThrow(message);
        expect(() => captured?.warn("x")).toThrow(
            "QueryContext.warn was called after the computation of Capture(null) finished."
        );
    });
});

describe("cycle detection", function () {
    it("detects a query that reads itself", async function () {
        let calls = 0;
        const Self = defineQuery<{ id: number }, number>({
            name: "Self",
            query(ctx, params): Promise<number> {
                calls += 1;
                return ctx.get(Self, params);
            }
        });

        const db = createDb();
        const message = 'Query cycle detected: Self({"id":1}) -> Self({"id":1})';
        await expect(db.get(Self, { id: 1 })).rejects.toThrow(message);
        await expect(db.get(Self, { id: 1 })).rejects.toThrow(message);
        assert.strictEqual(calls, 1);
    });

    it("detects a cycle through waiting computations", async function () {
        const A = defineQuery<null, number>({
            name: "A",
            query: (ctx): Promise<number> => ctx.get(B, null)
        });
        const B = defineQuery<null, number>({
            name: "B",
            query: (ctx): Promise<number> => ctx.get(C, null)
        });
        const C = defineQuery<null, number>({
            name: "C",
            query: (ctx): Promise<number> => ctx.get(A, null)
        });

        const db = createDb();
        const message = "Query cycle detected: C(null) -> A(null) -> B(null) -> C(null)";
        await expect(db.get(A, null)).rejects.toThrow(message);
        await expect(db.get(B, null)).rejects.toThrow(message);
        await expect(db.get(C, null)).rejects.toThrow(message);
    });

    it("detects a cycle through one of several concurrent inputs", async function () {
        const leaf = createDeferred<number>();
        const Leaf = defineQuery<null, number>({
            name: "Leaf",
            query: () => leaf.promise
        });
        const Root = defineQuery<null, number>({
            name: "Root",
            async query(ctx) {
                const [a, b] = await Promise.all([ctx.get(Leaf, null), ctx.get(Back, null)]);
                return a + b;
            }
        });
        const Back = defineQuery<null, number>({
            name: "Back",
            query: (ctx): Promise<number> => ctx.get(Root, null)
        });

        const db = createDb();
        await expect(db.get(Root, null)).rejects.toThrow(
            "Query cycle detected: Back(null) -> Root(null) -> Back(null)"
        );
        leaf.resolve(1);
        assert.strictEqual(await db.get(Leaf, null), 1);
    });
});

function createDb(): QueryDb<undefined> {
    return new QueryDb({ host: undefined });
}

interface Deferred<T> {
    promise: Promise<T>;
    resolve(value: T): void;
    reject(error: unknown): void;
}

function createDeferred<T>(): Deferred<T> {
    const { promise, resolve, reject } = Promise.withResolvers<T>();
    return { promise, resolve, reject };
}

function tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}
