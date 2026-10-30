// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { assert, expect, it } from "vitest";
import { defineQuery, QueryContext } from "./defineQuery";
import { QueryDb } from "./QueryDb";

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

it("rejects context methods that are not implemented yet", async function () {
    const calls: Array<(ctx: QueryContext) => unknown> = [
        (ctx) => ctx.get(Probe, null),
        (ctx) => ctx.readFile("/x" as never),
        (ctx) => ctx.fileExists("/x" as never),
        (ctx) => ctx.watchFile("/x" as never),
        (ctx) => ctx.warn("x")
    ];
    const Probe = defineQuery<null, void>({
        name: "Probe",
        async query() {}
    });

    for (const [index, call] of calls.entries()) {
        const Caller = defineQuery<{ index: number }, unknown>({
            name: "Caller",
            query: async (ctx) => call(ctx)
        });
        const db = createDb();
        await expect(db.get(Caller, { index })).rejects.toThrow(/is not implemented yet/);
    }
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
