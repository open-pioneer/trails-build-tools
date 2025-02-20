// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import * as git from "@changesets/git";
import { Mock, afterEach, describe, expect, it, vi } from "vitest";
import { dirname, join, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { run } from "./run";

vi.mock("@changesets/git");
vi.mock("@changesets/logger");

describe("tag command", () => {
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
            expect((git.tag as Mock).mock.calls[0]![0]).toEqual("pkg-a@1.0.0");
            expect((git.tag as Mock).mock.calls[1]![0]).toEqual("pkg-b@1.0.0");
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
            expect((git.tag as Mock).mock.calls[0]![0]).toEqual("pkg-b@1.0.0");
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
