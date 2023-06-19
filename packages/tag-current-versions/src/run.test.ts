// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import * as git from "@changesets/git";
import { Mock, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as logger from "@changesets/logger";
import { dirname, join, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { run } from "./run";

vi.mock("@changesets/git");

describe("tag command", () => {
    temporarilySilenceLogs();

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe("workspace project", () => {
        it("tags all packages", async () => {
            const cwd = await testdir("all-packages", {
                "package.json": JSON.stringify({
                    private: true,
                    workspaces: ["packages/*"]
                }),
                "packages/pkg-a/package.json": JSON.stringify({
                    name: "pkg-a",
                    version: "1.0.0",
                    dependencies: {
                        "pkg-b": "1.0.0"
                    }
                }),
                "packages/pkg-b/package.json": JSON.stringify({
                    name: "pkg-b",
                    version: "1.0.0"
                })
            });

            (git.getAllTags as Mock).mockReturnValue(new Set());

            expect(git.tag).not.toHaveBeenCalled();
            await run(cwd);
            expect(git.tag).toHaveBeenCalledTimes(2);
            expect((git.tag as Mock).mock.calls[0][0]).toEqual("pkg-a@1.0.0");
            expect((git.tag as Mock).mock.calls[1][0]).toEqual("pkg-b@1.0.0");
        });

        it("skips tags that already exist", async () => {
            const cwd = await testdir("skips-existing-tags", {
                "package.json": JSON.stringify({
                    private: true,
                    workspaces: ["packages/*"]
                }),
                "packages/pkg-a/package.json": JSON.stringify({
                    name: "pkg-a",
                    version: "1.0.0",
                    dependencies: {
                        "pkg-b": "1.0.0"
                    }
                }),
                "packages/pkg-b/package.json": JSON.stringify({
                    name: "pkg-b",
                    version: "1.0.0"
                })
            });

            (git.getAllTags as Mock).mockReturnValue(
                new Set([
                    // pkg-a should not be re-tagged
                    "pkg-a@1.0.0"
                ])
            );

            expect(git.tag).not.toHaveBeenCalled();
            await run(cwd);
            expect(git.tag).toHaveBeenCalledTimes(1);
            expect((git.tag as Mock).mock.calls[0][0]).toEqual("pkg-b@1.0.0");
        });

        it("skips private package", async () => {
            const cwd = await testdir("skips-private-package", {
                "package.json": JSON.stringify({
                    private: true,
                    workspaces: ["packages/*"]
                }),
                "packages/pkg-a/package.json": JSON.stringify({
                    name: "pkg-a",
                    version: "1.0.0",
                    dependencies: {
                        "pkg-b": "1.0.0"
                    }
                }),
                "packages/pkg-b/package.json": JSON.stringify({
                    name: "pkg-b",
                    version: "1.0.0",
                    private: true
                })
            });

            (git.getAllTags as Mock).mockReturnValue(
                new Set([
                    // pkg-a should not be re-tagged
                    "pkg-a@1.0.0"
                ])
            );

            expect(git.tag).not.toHaveBeenCalled();
            await run(cwd);
            expect(git.tag).not.toHaveBeenCalled(); // pkg-b not tagged because its private
        });

        it("skips package without version", async () => {
            const cwd = await testdir("skips-private-package", {
                "package.json": JSON.stringify({
                    private: true,
                    workspaces: ["packages/*"]
                }),
                "packages/pkg-a/package.json": JSON.stringify({
                    name: "pkg-a",
                    version: "1.0.0",
                    dependencies: {
                        "pkg-b": "1.0.0"
                    }
                }),
                "packages/pkg-b/package.json": JSON.stringify({
                    name: "pkg-b"
                })
            });

            (git.getAllTags as Mock).mockReturnValue(
                new Set([
                    // pkg-a should not be re-tagged
                    "pkg-a@1.0.0"
                ])
            );

            expect(git.tag).not.toHaveBeenCalled();
            await run(cwd);
            expect(git.tag).not.toHaveBeenCalled(); // pkg-b not tagged because it has no version
        });
    });
});

function temporarilySilenceLogs() {
    const originalError = logger.error;
    const originalInfo = logger.info;
    const originalLog = logger.log;
    const originalWarn = logger.warn;
    const originalSuccess = logger.success;
    const rawLogger = logger as any;
    beforeEach(() => {
        rawLogger.error = vi.fn();
        rawLogger.info = vi.fn();
        rawLogger.log = vi.fn();
        rawLogger.warn = vi.fn();
        rawLogger.success = vi.fn();
    });
    afterEach(() => {
        rawLogger.error = originalError;
        rawLogger.info = originalInfo;
        rawLogger.log = originalLog;
        rawLogger.warn = originalWarn;
        rawLogger.success = originalSuccess;
    });
}

async function testdir(name: string, contents: Record<string, string>) {
    const temp = resolve(__dirname, "../temp", name);
    await Promise.all(
        Object.entries(contents).map(async ([filename, content]) => {
            const fullPath = join(temp, filename);
            await mkdir(dirname(fullPath), { recursive: true });
            await writeFile(fullPath, content, "utf-8");
        })
    );
    return temp;
}