#!/usr/bin/env node
// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { exit } from "node:process";
import { getChalk } from "@open-pioneer/cli-logging";
import { Command } from "commander";
import { version } from "../package.json";
import { createLicenseReport } from "./createLicenseReport";

const LICENSE_CONFIG = "support/license-config.yaml";
const WORKING_DIR = process.cwd();
const OUTPUT_HTML = "dist/license-report.html";

const program = new Command();
program
    .name("create-license-report")
    .description("Create a license file for Open Pioneer Trails ")
    .option(
        "-w, --working-dir <path>",
        "path to the working directory (default: current directory)"
    )
    .option("-c, --config <path>", "path to the license config file", LICENSE_CONFIG)
    .option("-o, --output <path>", "path to the result file", OUTPUT_HTML)
    .option("-q, --silent", "disable logging", false)
    .option("-x, --debug", "show exception stack traces", false)
    .version(version);
program.parse();

async function main() {
    const chalk = await getChalk();
    const opts = program.opts();
    const workingDir = opts.workingDir ?? WORKING_DIR;
    try {
        await createLicenseReport({
            configPath: opts.config,
            workingDir: workingDir,
            outputHtmlPath: opts.output,
            log: !opts.silent
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
