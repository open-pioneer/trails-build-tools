// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import { $, ProcessOutput, usePowerShell } from "zx";
import { PACKAGE_DIR, TEMP_PATH } from "./paths";

const PATH_TO_DIST = "node_modules/@open-pioneer/create-license-cli/dist/index.js";

export interface RunResult {
    exitCode: number;
    output: string;
}

if (process.platform === "win32") {
    usePowerShell();
}

export async function helpMessage(): Promise<string> {
    const cli = resolve(PACKAGE_DIR, PATH_TO_DIST);
    const shell = $({ cwd: TEMP_PATH });
    const processOutputLicense = await shell`node ${cli} --help`;
    return processOutputLicense.toString();
}

export async function runCli(
    configFile: string = "license-config-all.yaml",
    outputFile?: string
): Promise<RunResult> {
    const cli = resolve(PACKAGE_DIR, PATH_TO_DIST);
    const shell = $({ cwd: TEMP_PATH });
    const outputPath = outputFile ?? resolve(TEMP_PATH, "test-abc.html");
    const configPath = resolve(TEMP_PATH, configFile);

    const flags: string[] = ["-c", configPath, "-w", TEMP_PATH, "-o", outputPath];

    try {
        const result = await shell`node ${cli} ${flags}`.quiet();
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
