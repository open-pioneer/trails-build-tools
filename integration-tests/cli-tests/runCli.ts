// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { exec } from "node:child_process";
import { relative, resolve } from "node:path";
import { copy } from "fs-extra";
import { promisify } from "node:util";
import { PACKAGE_DIR, TEMP_DATA_DIR, TEST_DATA_DIR } from "./paths";

const asyncExec = promisify(exec);

export interface RunResult {
    targetDir: string;
    stdout: string;
    stderr: string;
}

export async function runCli(packageDirectory: string): Promise<RunResult> {
    const rel = relative(TEST_DATA_DIR, packageDirectory);
    const copyDir = resolve(TEMP_DATA_DIR, rel);
    const targetDir = resolve(copyDir, "dist");
    const cli = resolve(PACKAGE_DIR, "node_modules/.bin/build-pioneer-package");

    // Copy package into temp, then invoke build-pioneer-package CLI.
    // Compiled output is written into copyDir/dist
    await copy(packageDirectory, copyDir);
    const { stdout, stderr } = await asyncExec(cli, {
        cwd: copyDir
    });

    const stableStdout = stdout.replace(/Building package at .*/, "Building package at <PATH>");

    return {
        targetDir,
        stdout: stableStdout,
        stderr
    };
}
