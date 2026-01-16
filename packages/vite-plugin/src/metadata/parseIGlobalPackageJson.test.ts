// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { readRootPackageForRuntimeVersion } from "./parseIGlobalPackageJson";
import { describe, it, expect } from "vitest";
import { join, resolve } from "node:path";
import { TEST_DATA_DIR } from "../utils/testUtils";
import { MIN_SUPPORTED_RUNTIME_VERSION } from "@open-pioneer/build-common";

describe("parse global runtime configuration", function () {
    it("parse runtime Version globally", async function () {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-runtimeversions-mix");
        const mockDir = join(rootDir, "apps");
        const runtimeVersion = await readRootPackageForRuntimeVersion(mockDir);
        expect(runtimeVersion).toBe("1.1.0");
    });

    it("No runtime Version to parse, use minimum", async function () {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-runtimeversions-mix");
        const mockDir = join(rootDir, "apps/test-app-no-runtime-version");
        const runtimeVersion = await readRootPackageForRuntimeVersion(mockDir);
        expect(runtimeVersion).toBe(MIN_SUPPORTED_RUNTIME_VERSION);
    });

    it("fail on runtimeVersion parse ", async function () {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-runtimeversions-mix");
        const mockDir = join(rootDir, "apps/globalRuntimeVersionTest/apps");
        await expect(readRootPackageForRuntimeVersion(mockDir)).rejects.toThrow(
            /Unsupported runtime version 5\.0\.0/
        );
    });
});
