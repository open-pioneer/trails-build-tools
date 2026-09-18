// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Minimum major version of pnpm supported by this tool. */
export const MIN_PNPM_MAJOR = 11;

/**
 * A dependency as reported by `pnpm list --json`.
 */
export interface PnpmDependency {
    /** The actual package name (differs from the key in the parent map for aliased dependencies). */
    from: string;

    /** The resolved version. Workspace packages use `link:<path>`. */
    version: string;

    /**
     * Transitive dependencies.
     * pnpm expands the dependencies of a package version only the first time it is encountered.
     */
    dependencies?: Record<string, PnpmDependency>;
}

/**
 * A workspace project as reported by `pnpm list --json`.
 */
export interface PnpmProject {
    name?: string;
    path: string;
    dependencies?: Record<string, PnpmDependency>;
    devDependencies?: Record<string, PnpmDependency>;
    optionalDependencies?: Record<string, PnpmDependency>;
}

/**
 * Returns the version of the `pnpm` executable (e.g. `"12.4.2"`).
 */
export async function getPnpmVersion(directory: string): Promise<string> {
    const { stdout } = await runPnpm(directory, ["--version"]);
    return stdout.trim();
}

/**
 * Throws if the given pnpm version is not supported by this tool.
 */
export function assertSupportedPnpmVersion(version: string): void {
    const major = Number.parseInt(version, 10);
    if (Number.isNaN(major) || major < MIN_PNPM_MAJOR) {
        throw new Error(
            `Unsupported pnpm version '${version}': this tool requires pnpm >= ${MIN_PNPM_MAJOR}.`
        );
    }
}

/**
 * Lists all packages in the lockfile of the given directory (including transitive dependencies)
 * by invoking `pnpm list`.
 *
 * All projects of the workspace are included.
 */
export async function listPackages(
    directory: string,
    skipDevDependencies: boolean
): Promise<PnpmProject[]> {
    if (!existsSync(resolve(directory, "pnpm-lock.yaml"))) {
        throw new Error(`Failed to find a lockfile in ${directory}`);
    }

    const args = ["list", "--recursive", "--json", "--depth=Infinity", "--lockfile-only"];
    if (skipDevDependencies) {
        args.push("--prod");
    }
    const { stdout } = await runPnpm(directory, args);
    return JSON.parse(stdout) as PnpmProject[];
}

function runPnpm(directory: string, args: string[]) {
    return execFileAsync("pnpm", args, {
        cwd: directory,
        encoding: "utf-8",
        // The default limit (1 MiB) is too small for larger workspaces
        maxBuffer: 1024 * 1024 * 1024,
        // pnpm is a `.cmd` script on windows, which can only be started through a shell
        shell: process.platform === "win32"
    });
}
