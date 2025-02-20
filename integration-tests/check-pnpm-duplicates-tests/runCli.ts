// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import { $, ProcessOutput } from "zx";
import { PACKAGE_DIR } from "./paths";

export interface RunResult {
    exitCode: number;
    output: string;
}

export async function runCli(workdir: string, configPath: string | undefined): Promise<RunResult> {
    const cli = resolve(PACKAGE_DIR, "node_modules/.bin/check-pnpm-duplicates");
    const flags: string[] = ["--debug"];
    if (configPath) {
        flags.push("-c", configPath);
    }

    try {
        const result = await $({ cwd: workdir })`${cli} ${flags}`.quiet();
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
