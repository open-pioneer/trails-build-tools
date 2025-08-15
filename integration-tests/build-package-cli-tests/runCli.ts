// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { relative, resolve } from "node:path";
import { copy } from "fs-extra";
import { PACKAGE_DIR, TEMP_DATA_DIR, TEST_DATA_DIR } from "./paths";
import { $, usePowerShell } from "zx";

const os = process.platform; //returns win32 even on win 64bit
if (os === "win32") {
    usePowerShell();
}

export interface RunResult {
    targetDir: string;
    stdout: string;
    stderr: string;
}

export async function runCli(packageDirectory: string): Promise<RunResult> {
    const rel = relative(TEST_DATA_DIR, packageDirectory);
    const copyDir = resolve(TEMP_DATA_DIR, rel);
    const targetDir = resolve(copyDir, "dist");
    const cli = resolve(PACKAGE_DIR, "node_modules/@open-pioneer/build-package-cli/dist/index.js");

    // Copy package into temp, then invoke build-pioneer-package CLI.
    // Compiled output is written into copyDir/dist
    await copy(packageDirectory, copyDir);

    const { stdout, stderr } = await $({ cwd: copyDir })`node ${cli}`.quiet();
    const stableStdout = stdout.replace(/Building package at .*/, "Building package at <PATH>");
    return {
        targetDir,
        stdout: stableStdout,
        stderr
    };
}
