// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { assert } from "chai";
import { parseI18nFile } from "./parseI18nYaml";

describe("parseI18nFile", function () {
    it("parses an empty i18n object", function () {
        const input = {};
        const result = parseI18nFile(input);
        assert.deepEqual(result, {
            messages: new Map(),
            overrides: new Map()
        });
    });

    it("parses an i18n object with plain messages", function () {
        const input = {
            messages: {
                foo: "hello"
            }
        };
        const result = parseI18nFile(input);
        const messages = Object.fromEntries(result.messages);
        assert.deepEqual(messages, {
            foo: "hello"
        });
    });

    it("parses an i18n object with nested message syntax", function () {
        const input = {
            messages: {
                foo: {
                    bar: {
                        "baz.qux": {
                            greeting: "hello"
                        }
                    }
                }
            }
        };
        const result = parseI18nFile(input);
        const messages = Object.fromEntries(result.messages);
        assert.deepEqual(messages, {
            "foo.bar.baz.qux.greeting": "hello"
        });
    });

    it("throws an error when neither an object nor a string is used", function () {
        const input = {
            messages: {
                foo: 4
            }
        };
        assert.throws(() => parseI18nFile(input), /Expected string, received number/);
    });

    it("supports the 'overrides' blocks", function () {
        const input = {
            overrides: {
                packageName: {
                    foo: "hello",
                    bar: {
                        baz: "qux"
                    }
                }
            }
        };
        const result = parseI18nFile(input);
        const overrides = result.overrides;
        assert.strictEqual(overrides.size, 1);

        const packageOverrides = overrides.get("packageName")!;
        assert.deepEqual(Object.fromEntries(packageOverrides), {
            "foo": "hello",
            "bar.baz": "qux"
        });
    });
});