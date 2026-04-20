// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { Command } from "commander";
import { exit } from "node:process";
import { version } from "../package.json";
import { createLicenseFile } from "./create-license-report";

const LICENSE_CONFIG = "support/license-config.yaml";
const WORKING_DIR = process.cwd();
const OUTPUT_HTML = "dist/license-report.html";

const program = new Command();
program
    .name("build-pioneer-license")
    .description("Create a license file for Open Pioneer Trails ")
    .option(
        "-w, --working-dir <path>",
        "path to the working directory (default: current directory)"
    )
    .option("-c, --config <path>", "path to the license config file", LICENSE_CONFIG)
    .option("-o, --output <path>", "path to the result file", OUTPUT_HTML)
    .option("-d, --dev", "include dev dependencies", false)
    .option("-i, --ignore-workspace", "ignore the workspace, only look at the lock file", false)
    .option("-q, --silent", "disable logging", false)
    .option("-x, --debug", "show exception stack traces", false)
    .version(version);
program.parse();

async function main() {
    const chalk = (await import("chalk")).default;
    const opts = program.opts();
    const workingDir = opts.workingDir ?? WORKING_DIR;
    try {
        await createLicenseFile({
            configPath: opts.config,
            workingDir: workingDir,
            outputHtmlPath: opts.output,
            dev: opts.dev,
            log: !opts.silent,
            ignoreWorkspace: opts.ignoreWorkspace
        });
        exit(0);
    } catch (e) {
        if (opts.debug) {
            console.error(e);
        } else {
            console.error(chalk.red((e as Error).message ?? String(e)));
        }
        exit(1);
    }
}

main().catch((e) => {
    console.error("Fatal error", e);
    exit(1);
});
