// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import { $, ProcessOutput, usePowerShell } from "zx";
import { PACKAGE_DIR, PROJECT_DIR, TEMP_PATH, TEST_DATA_DIR } from "./paths";
import { LicenseOptions } from "@open-pioneer/build-license-cli";

const PATH_TO_DIST = "node_modules/@open-pioneer/build-license-cli/dist/index.js";

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

export async function runCli(missingConfigTest: boolean = false): Promise<RunResult> {
    const cli = resolve(PACKAGE_DIR, PATH_TO_DIST);
    const shell = $({ cwd: TEMP_PATH });
    const outputPath = resolve(TEMP_PATH, "test-abc.html");

    const flags: string[] = [];
    if (missingConfigTest) {
        const missingConfig = resolve(TEMP_PATH, "license-config-missing.yaml");
        flags.push("-c", missingConfig, "-w", TEMP_PATH, "-o", outputPath, "-i", "-d");
    } else {
        const configPath = resolve(TEMP_PATH, "license-config-all.yaml");
        flags.push("-c", configPath, "-w", TEMP_PATH, "-o", outputPath, "-i", "-d");
    }

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
