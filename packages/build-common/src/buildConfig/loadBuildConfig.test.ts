// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TEST_DATA_DIR } from "../test-utils/paths";
import { loadBuildConfig } from "./loadBuildConfig";

describe("loadBuildConfig", function () {
    it("loads valid configuration file (.mjs)", async function () {
        const path = resolve(TEST_DATA_DIR, "valid-build-config.mjs");
        const config = await loadBuildConfig(path);
        expect(config.styles).toStrictEqual("./foo.css");
    });

    it("loads valid configuration file (.mts)", async function () {
        const path = resolve(TEST_DATA_DIR, "valid-build-config.mts");
        const config = await loadBuildConfig(path);
        expect(config.styles).toStrictEqual("./foo.css");
    });

    it("loads valid configuration file (.ts)", async function () {
        const path = resolve(TEST_DATA_DIR, "valid-build-config.ts");
        const config = await loadBuildConfig(path);
        expect(config.styles).toStrictEqual("./bar.css");
    });

    it("loads valid configuration file (.js)", async function () {
        const path = resolve(TEST_DATA_DIR, "valid-build-config.js");
        const config = await loadBuildConfig(path);
        expect(config.styles).toStrictEqual("./baz.css");
    });

    it("throws an error if a config file does not exist", async function () {
        const path = resolve(TEST_DATA_DIR, "does-not-exist.mjs");
        await expect(loadBuildConfig(path)).rejects.toThrowError(/does not exist/);
    });

    it("throws an error if the config file does not have a default export", async function () {
        const path = resolve(TEST_DATA_DIR, "build-config-without-export.mjs");
        // When there's no default export, jiti returns undefined, which triggers our check
        await expect(loadBuildConfig(path)).rejects.toThrowError(
            /must provide a default export|Validation error/
        );
    });

    it("throws an error if the config file does not match the schema", async function () {
        const path = resolve(TEST_DATA_DIR, "build-config-with-invalid-values.mjs");
        await expect(loadBuildConfig(path)).rejects.toSatisfy((value) => {
            const err = value as Error;
            const matches =
                err.message.match(/Validation error/) &&
                (err.cause as Error)?.message.match(/Expected string, received number at "styles"/);
            return !!matches;
        });
    });

    it("throws an error if TypeScript config file does not match the schema", async function () {
        const path = resolve(TEST_DATA_DIR, "build-config-invalid-typescript.ts");
        await expect(loadBuildConfig(path)).rejects.toSatisfy((value) => {
            const err = value as Error;
            return err.message.match(/Validation error/) !== null;
        });
    });
});
