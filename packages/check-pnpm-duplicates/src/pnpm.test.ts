// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { assertSupportedPnpmVersion, getPnpmVersion, listPackages } from "./pnpm";
import { setupPnpmWorkspace, TEMP_DATA_DIR } from "./testing/paths";

let projectDir!: string;
beforeAll(() => {
    projectDir = setupPnpmWorkspace("simple-dups", "pnpm");
});

describe("assertSupportedPnpmVersion", () => {
    it("accepts supported versions", () => {
        expect(() => assertSupportedPnpmVersion("11.0.0")).not.toThrow();
        expect(() => assertSupportedPnpmVersion("12.4.2")).not.toThrow();
    });

    it("rejects old versions", () => {
        expect(() => assertSupportedPnpmVersion("10.34.5")).toThrowErrorMatchingInlineSnapshot(
            `[Error: Unsupported pnpm version '10.34.5': this tool requires pnpm >= 11.]`
        );
    });

    it("rejects garbage", () => {
        expect(() => assertSupportedPnpmVersion("")).toThrowErrorMatchingInlineSnapshot(
            `[Error: Unsupported pnpm version '': this tool requires pnpm >= 11.]`
        );
    });
});

describe("getPnpmVersion", () => {
    it("returns the version of the installed pnpm", async () => {
        const version = await getPnpmVersion(projectDir);
        expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });
});

describe("listPackages", () => {
    it("lists all workspace projects with their transitive dependencies", async () => {
        const projects = await listPackages(projectDir, false);
        expect(projects.map((p) => p.name)).toContain("root");
        expect(projects.map((p) => p.name)).toContain("map");
        expect(projects).toHaveLength(36);

        const root = projects.find((p) => p.name === "root")!;
        const changesets = root.devDependencies?.["@changesets/cli"];
        expect(changesets?.from).toBe("@changesets/cli");
        expect(changesets?.version).toBe("2.27.8");
        expect(Object.keys(changesets?.dependencies ?? {})).toContain(
            "@changesets/apply-release-plan"
        );
    });

    it("skips devDependencies on request", async () => {
        const projects = await listPackages(projectDir, true);
        const root = projects.find((p) => p.name === "root")!;
        expect(root.devDependencies).toBeUndefined();

        // The map package has regular dependencies
        const map = projects.find((p) => p.name === "map")!;
        expect(map.devDependencies).toBeUndefined();
        expect(Object.keys(map.dependencies ?? {})).toContain("ol");
    });

    it("throws if there is no lockfile", async () => {
        const emptyDir = resolve(TEMP_DATA_DIR, "pnpm-empty");
        rmSync(emptyDir, { recursive: true, force: true });
        mkdirSync(emptyDir, { recursive: true });
        await expect(listPackages(emptyDir, false)).rejects.toThrow(/Failed to find a lockfile/);
    });
});
