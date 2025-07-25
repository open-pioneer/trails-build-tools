// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { parseI18nYaml, parseI18nFile } from "./parseI18nYaml";
import { describe, it, assert, expect } from "vitest";

describe("parseI18nFile", function () {
    it("parses empty yaml", function () {
        const result = parseI18nYaml("");
        assert.deepEqual(result, {
            messages: new Map(),
            overrides: undefined
        });
    });

    it("parses empty messages", function () {
        const result = parseI18nYaml(`messages:`);
        assert.deepEqual(result, {
            messages: new Map(),
            overrides: undefined
        });
    });

    it("parses empty block in messages", function () {
        const result = parseI18nYaml(
            `
messages:
  group:
  key: "hi"
`.trim()
        );
        assert.deepEqual(result, {
            messages: new Map([["key", "hi"]]),
            overrides: undefined
        });
    });

    it("parses empty overrides", function () {
        const result = parseI18nYaml(`overrides:`);
        assert.deepEqual(result, {
            messages: new Map(),
            overrides: new Map()
        });
    });

    it("parses empty messages in overrides", function () {
        const result = parseI18nYaml(
            `
overrides:
  package-name:
`.trim()
        );
        assert.deepEqual(result, {
            messages: new Map(),
            overrides: new Map([["package-name", new Map()]])
        });
    });

    it("throws for unexpected keys", function () {
        expect(() => parseI18nYaml(`foo:`)).toThrowErrorMatchingInlineSnapshot(
            `[ZodValidationError: Validation error: Unrecognized key(s) "foo" in object]`
        );
    });

    it("parses an empty i18n object", function () {
        const input = {};
        const result = parseI18nFile(input);
        assert.deepEqual(result, {
            messages: new Map(),
            overrides: undefined
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

        expect(() => parseI18nFile(input)).toThrowErrorMatchingInlineSnapshot(
            `[ZodValidationError: Validation error: Expected string, received number at "messages.foo" or Expected record, received number at "messages.foo"]`
        );
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
        assert.strictEqual(overrides?.size, 1);

        const packageOverrides = overrides!.get("packageName")!;
        assert.deepEqual(Object.fromEntries(packageOverrides), {
            "foo": "hello",
            "bar.baz": "qux"
        });
    });
});
