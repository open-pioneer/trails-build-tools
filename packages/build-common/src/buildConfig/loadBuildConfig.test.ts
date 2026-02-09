// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TEST_DATA_DIR } from "../test-utils/paths";
import { loadBuildConfig } from "./loadBuildConfig";
import { BuildConfig } from "@open-pioneer/build-support";

describe("loadBuildConfig", function () {
    it("loads valid configuration file", async function () {
        const path = resolve(TEST_DATA_DIR, "valid-build-config.mjs");
        const config = await loadBuildConfig(path);
        expect(config.styles).toStrictEqual("./foo.css");
    });

    it("throws an error if a config file does not exist", async function () {
        const path = resolve(TEST_DATA_DIR, "does-not-exist.mjs");
        await expect(loadBuildConfig(path)).rejects.toThrowError(/does not exist/);
    });

    it("throws an error if the config file does not have a default export", async function () {
        const path = resolve(TEST_DATA_DIR, "build-config-without-export.mjs");
        await expect(loadBuildConfig(path)).rejects.toThrowError(/must provide a default export/);
    });

    it("throws an error if the config file does not match the schema", async function () {
        const path = resolve(TEST_DATA_DIR, "build-config-with-invalid-values.mjs");
        const error = await expectAsyncError(() => loadBuildConfig(path));
        expect(error.message).toMatch(/Expected string, received number at "styles"/);
    });
});

function expectAsyncError(fn: () => Promise<BuildConfig>): Promise<any> {
    return new Promise((resolve, reject) => {
        fn().then(() => {
            reject(new Error("unexpected success: expected the operation to fail"));
        }, resolve);
    });
}
