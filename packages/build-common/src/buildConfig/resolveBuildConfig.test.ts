// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { TEMP_DATA_DIR } from "../test-utils/paths";
import { resolveBuildConfigPath } from "./resolveBuildConfig";

describe("resolveBuildConfigPath", function () {
    const testDir = join(TEMP_DATA_DIR, "resolve-test");

    afterEach(() => {
        // Clean up test directory after each test
        try {
            rmSync(testDir, { recursive: true, force: true });
        } catch {
            // Ignore errors
        }
    });

    it("returns undefined if no config file exists", function () {
        mkdirSync(testDir, { recursive: true });
        const result = resolveBuildConfigPath(testDir);
        expect(result).toBeUndefined();
    });

    it("finds build.config.mts file", function () {
        mkdirSync(testDir, { recursive: true });
        const configPath = join(testDir, "build.config.mts");
        writeFileSync(configPath, "export default {};");

        const result = resolveBuildConfigPath(testDir);
        expect(result).toBe(configPath);
    });

    it("finds build.config.ts file", function () {
        mkdirSync(testDir, { recursive: true });
        const configPath = join(testDir, "build.config.ts");
        writeFileSync(configPath, "export default {};");

        const result = resolveBuildConfigPath(testDir);
        expect(result).toBe(configPath);
    });

    it("finds build.config.mjs file", function () {
        mkdirSync(testDir, { recursive: true });
        const configPath = join(testDir, "build.config.mjs");
        writeFileSync(configPath, "export default {};");

        const result = resolveBuildConfigPath(testDir);
        expect(result).toBe(configPath);
    });

    it("finds build.config.js file", function () {
        mkdirSync(testDir, { recursive: true });
        const configPath = join(testDir, "build.config.js");
        writeFileSync(configPath, "export default {};");

        const result = resolveBuildConfigPath(testDir);
        expect(result).toBe(configPath);
    });

    it("prefers .mts over other extensions", function () {
        mkdirSync(testDir, { recursive: true });
        const mtsPath = join(testDir, "build.config.mts");
        const mjsPath = join(testDir, "build.config.mjs");
        writeFileSync(mtsPath, "export default {};");
        writeFileSync(mjsPath, "export default {};");

        const result = resolveBuildConfigPath(testDir);
        expect(result).toBe(mtsPath);
    });

    it("prefers .ts over .mjs and .js", function () {
        mkdirSync(testDir, { recursive: true });
        const tsPath = join(testDir, "build.config.ts");
        const mjsPath = join(testDir, "build.config.mjs");
        const jsPath = join(testDir, "build.config.js");
        writeFileSync(tsPath, "export default {};");
        writeFileSync(mjsPath, "export default {};");
        writeFileSync(jsPath, "export default {};");

        const result = resolveBuildConfigPath(testDir);
        expect(result).toBe(tsPath);
    });

    it("prefers .mjs over .js", function () {
        mkdirSync(testDir, { recursive: true });
        const mjsPath = join(testDir, "build.config.mjs");
        const jsPath = join(testDir, "build.config.js");
        writeFileSync(mjsPath, "export default {};");
        writeFileSync(jsPath, "export default {};");

        const result = resolveBuildConfigPath(testDir);
        expect(result).toBe(mjsPath);
    });
});
