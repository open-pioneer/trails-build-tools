// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { assert } from "chai";
import { Cache, CacheProvider } from "./Cache";

describe("Cache", function () {
    it("should cache computed values until invalidated", async function () {
        let providerCalled = 0;
        const cache = new Cache<string, string>({
            getId(key) {
                return key;
            },
            async getValue(key) {
                providerCalled += 1;
                return key + "-" + key;
            }
        });

        const value1 = await cache.get("foo");
        assert.strictEqual(value1, "foo-foo");
        assert.strictEqual(providerCalled, 1);

        const value2 = await cache.get("foo");
        assert.strictEqual(value2, value1);
        assert.strictEqual(providerCalled, 1);

        cache.invalidate("foo");
        const value3 = await cache.get("foo");
        assert.strictEqual(value3, value1);
        assert.strictEqual(providerCalled, 2);

        await cache.get("bar");
        assert.strictEqual(providerCalled, 3);
    });

    it("should support complex keys", async function () {
        interface Key {
            a: number;
            b: number;
        }

        let providerCalled = 0;
        const provider: CacheProvider<Key, string> = {
            getId(key) {
                return JSON.stringify(key);
            },
            async getValue(key) {
                providerCalled += 1;
                return `${key.a} + ${key.b}`;
            }
        };
        const cache = new Cache(provider);

        const value1 = await cache.get({ a: 1, b: 2 });
        assert.strictEqual(value1, "1 + 2");

        const value2 = await cache.get({ a: 4, b: 2 });
        assert.strictEqual(value2, "4 + 2");

        const value3 = await cache.get({ a: 1, b: 2 });
        assert.strictEqual(value3, "1 + 2");

        assert.strictEqual(providerCalled, 2);
    });

    it("should pass context values to provider", async function () {
        const observed: [string, number][] = [];
        const cache = new Cache<string, string, [string, number]>({
            getId(key) {
                return key;
            },
            async getValue(key, a, b) {
                observed.push([a, b]);
                return key;
            }
        });
        const value = await cache.get("123", "foo", -1);
        assert.strictEqual(value, "123");
        assert.deepStrictEqual(observed, [["foo", -1]]);
    });

    it("should invoke optional callback functions", async function () {
        const events: string[] = [];
        const cache = new Cache<string, string>({
            getId(key) {
                return key;
            },
            async getValue(key) {
                return key + key;
            },
            onInvalidate(key, oldValue) {
                events.push(`invalidate: ${key} ${oldValue}`);
            },
            onCachedReturn(key, value) {
                events.push(`cached return: ${key} ${value}`);
            }
        });

        const value = await cache.get("foo");
        assert.strictEqual(value, "foofoo");
        assert.deepStrictEqual(events, []);

        const value2 = await cache.get("foo");
        assert.strictEqual(value2, value);
        assert.deepStrictEqual(events, ["cached return: foo foofoo"]);

        cache.invalidate("foo");
        assert.deepStrictEqual(events, ["cached return: foo foofoo", "invalidate: foo foofoo"]);
    });
});
