// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import { $, ProcessOutput, usePowerShell } from "zx";
import { PACKAGE_DIR } from "./paths";

const os = process.platform; //returns win32 even on win 64bit
if (os === "win32") {
    usePowerShell();
}

export interface RunResult {
    exitCode: number;
    output: string;
}

export async function runCli(workdir: string, configPath: string | undefined): Promise<RunResult> {
    const cli = resolve(
        PACKAGE_DIR,
        "node_modules/@open-pioneer/check-pnpm-duplicates/dist/index.js"
    );
    const flags: string[] = ["--debug"];
    if (configPath) {
        flags.push("-c", configPath);
    }

    try {
        const result = await $({ cwd: workdir })`node ${cli} ${flags}`.quiet();
        return { exitCode: 0, output: result.toString() };
    } catch (e) {
        if (e instanceof ProcessOutput) {
            return {
                exitCode: e.exitCode ?? -1,
                output: e.toString()
            };
        }
        throw new Error("unexpected error from CLI");
    }
}
