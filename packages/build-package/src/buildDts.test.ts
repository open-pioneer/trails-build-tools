// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { TEMP_DATA_DIR, TEST_DATA_DIR } from "./testing/paths";
import { resolve } from "node:path";
import { cleanDir, readText } from "./testing/io";
import { buildDts, shouldGenerateTypes } from "./buildDts";
import { createMemoryLogger } from "./utils/Logger";
import { normalizeEntryPoints } from "./utils/entryPoints";
import { SUPPORTED_JS_EXTENSIONS } from "./model/PackageModel";

describe("buildDts", function () {
    it("generates .d.ts files for a simple typescript package", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-ts-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "simple-ts-declarations");
        const defaults = testDefaults();

        await cleanDir(outputDirectory);
        await buildDts({
            ...defaults,
            packageDirectory,
            outputDirectory,
            entryPoints: normalize(["index"])
        });

        expect(readText(resolve(outputDirectory, "index.d.ts"))).toMatchInlineSnapshot(`
          "import { PI } from \\"./utils/helper\\";
          export interface SomeInterface {
              foo: number;
          }
          export { PI };
          "
        `);
        expect(readText(resolve(outputDirectory, "utils/helper.d.ts"))).toMatchInlineSnapshot(`
          "export declare const PI = 3.14;
          "
        `);
        expect(defaults.logger.messages).toHaveLength(0);
    });

    it("generates .d.ts files for tsx files", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-tsx-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "simple-tsx-declarations");
        const defaults = testDefaults();

        await cleanDir(outputDirectory);
        await buildDts({
            ...defaults,
            packageDirectory,
            outputDirectory,
            entryPoints: normalize(["index"])
        });

        expect(readText(resolve(outputDirectory, "index.d.ts"))).toMatchInlineSnapshot(`
          "export interface GreetingProps {
              message: string;
          }
          export declare function Greeting({ message }: GreetingProps): import(\\"react/jsx-runtime\\").JSX.Element;
          "
        `);
        expect(defaults.logger.messages).toHaveLength(0);
    });

    it("generates .d.ts files for plain JavaScript when allowJs is enabled", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-js-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "simple-js-declarations");
        const defaults = testDefaults();

        await cleanDir(outputDirectory);
        await buildDts({
            ...defaults,
            packageDirectory,
            outputDirectory,
            entryPoints: normalize(["entryPointA", "entryPointB"])
        });

        expect(readText(resolve(outputDirectory, "entryPointA.d.ts"))).toMatchInlineSnapshot(`
          "export function helloA(): void;
          "
        `);
        expect(readText(resolve(outputDirectory, "entryPointB.d.ts"))).toMatchInlineSnapshot(`
          "export function helloB(): void;
          "
        `);
        expect(readText(resolve(outputDirectory, "dir/log.d.ts"))).toMatchInlineSnapshot(`
          "export function log(...args: any[]): void;
          "
        `);
        expect(defaults.logger.messages).toHaveLength(0);
    });

    it("emits an error if the custom tsconfig is invalid", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "project-with-invalid-tsconfig");
        const outputDirectory = resolve(TEMP_DATA_DIR, "project-with-invalid-tsconfig");
        const defaults = testDefaults();

        await cleanDir(outputDirectory);
        await expect(() =>
            buildDts({
                ...defaults,
                packageDirectory,
                outputDirectory,
                entryPoints: []
            })
        ).rejects.toMatchInlineSnapshot("[Error: Failed to read TypeScript configuration file.]");
        expect(defaults.logger.messages[0]!.args[0]!).matches(/Property assignment expected/);
    });

    it("emits declarations from invalid TypeScript code", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "project-with-typescript-errors");
        const outputDirectory = resolve(TEMP_DATA_DIR, "project-with-typescript-errors");
        const defaults = testDefaults();

        await cleanDir(outputDirectory);
        expect(
            await buildDts({
                ...defaults,
                packageDirectory,
                outputDirectory,
                entryPoints: normalize(["index"])
            })
        ).toBeUndefined();

        expect(readText(resolve(outputDirectory, "index.d.ts"))).toMatchInlineSnapshot(`
          "import foo from \\"does-not-exist\\";
          export declare const A = 3;
          export { foo as Foo123 };
          "
        `);

        const messages = defaults.logger.messages.map((m) => m.args[0]!);
        expect(messages[0]).match(/Cannot find module 'does-not-exist'/);
        expect(messages[1]).match(/Cannot assign to 'A' because it is a constant/);
        expect(messages[2]).match(/Cannot find name 'f'/);
    });

    it("throws when strict mode is enabled and typescript emits compiler errors", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "project-with-typescript-errors");
        const outputDirectory = resolve(TEMP_DATA_DIR, "project-with-typescript-errors-strict");
        const defaults = testDefaults();

        await cleanDir(outputDirectory);
        await expect(
            buildDts({
                ...defaults,
                packageDirectory,
                outputDirectory,
                entryPoints: normalize(["index"]),
                strict: true
            })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
            '"Aborting due to compilation errors (strict validation is enabled)."'
        );
    });
});

describe("shouldGenerateTypes", function () {
    it("returns true or false when 'force' parameter is used", async function () {
        expect(await shouldGenerateTypes("/does/not/exist", true)).toBe(true);
        expect(await shouldGenerateTypes("/does/not/exist", false)).toBe(false);
    });

    it("returns true if the directory contains ts files", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-ts-project");
        expect(await shouldGenerateTypes(packageDirectory)).toBe(true);
    });

    it("returns true if the directory contains tsx files", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-tsx-project");
        expect(await shouldGenerateTypes(packageDirectory)).toBe(true);
    });

    it("returns false if the directory contains only js files", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-js-project");
        expect(await shouldGenerateTypes(packageDirectory)).toBe(false);
    });
});

function testDefaults() {
    return {
        logger: createMemoryLogger(),
        strict: false
    };
}

function normalize(entryPoints: string[]) {
    return normalizeEntryPoints(entryPoints, SUPPORTED_JS_EXTENSIONS);
}
