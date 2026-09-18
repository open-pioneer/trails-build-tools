// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Minimum major version of pnpm supported by our command line tools. */
export const MIN_PNPM_MAJOR = 11;

/**
 * Throws if pnpm cannot be started in `directory` or if its version is not supported.
 */
export async function checkPnpmVersion(directory: string): Promise<void> {
    let version;
    try {
        version = await getPnpmVersion(directory);
    } catch (e) {
        throw new Error(`Failed to run pnpm. Is it installed?`, { cause: e });
    }
    assertSupportedPnpmVersion(version);
}

/**
 * Returns the version of the `pnpm` executable (e.g. `"12.4.2"`).
 */
export async function getPnpmVersion(directory: string): Promise<string> {
    const { stdout } = await runPnpm(directory, ["--version"]);
    return stdout.trim();
}

/**
 * Throws if the given pnpm version is not supported.
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
 * Runs `pnpm` with the given arguments in `directory` and returns its output.
 * Rejects if pnpm exits with a non-zero code.
 */
export function runPnpm(
    directory: string,
    args: string[]
): Promise<{ stdout: string; stderr: string }> {
    return execFileAsync("pnpm", args, {
        cwd: directory,
        encoding: "utf-8",
        // The default limit (1 MiB) is too small for larger workspaces
        maxBuffer: 1024 * 1024 * 1024,
        // pnpm is a `.cmd` script on windows, which can only be started through a shell
        shell: process.platform === "win32"
    });
}
