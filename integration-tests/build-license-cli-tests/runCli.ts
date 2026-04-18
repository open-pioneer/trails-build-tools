// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import { $, ProcessOutput, usePowerShell } from "zx";
import { PACKAGE_DIR } from "./paths";
import { LicenseOptions } from "@open-pioneer/build-license-cli";

const PATH_TO_DIST = "node_modules/@open-pioneer/build-license-cli/dist/index.js";

export interface RunResult {
    exitCode: number;
    output: string;
}
if (process.platform === "win32") {
    usePowerShell();
}

export async function helpMessage(workdir: string): Promise<string> {
    const cli = resolve(PACKAGE_DIR, PATH_TO_DIST);
    console.log(cli);
    // PowerShell auf Windows verwenden, da zx standardmäßig bash erwartet

    //TODO
    const shell = $({ cwd: workdir });
    const processOutputLicense = await shell`node ${cli} --help`;
    return processOutputLicense.toString();

    // const result = await $({ cwd: workdir })`node ${cli} ${flags}`.quiet();
}

export async function runCli(workdir: string, options: LicenseOptions): Promise<void> {
    const cli = resolve(PACKAGE_DIR, PATH_TO_DIST);

    // if (options.log) {
    //     flags.push("-l");
    // }
    // if (configPath) {
    //     flags.push("-c", configPath);
    // }
    //
    // try {
    //     const result = await $({ cwd: workdir })`node ${cli} ${flags}`.quiet();
    //     return { exitCode: 0, output: result.toString() };
    // } catch (e) {
    //     if (e instanceof ProcessOutput) {
    //         return {
    //             exitCode: e.exitCode ?? -1,
    //             output: e.toString()
    //         };
    //     }
    //     throw new Error("unexpected error from CLI");
    // }
}
