#!/usr/bin/env node
// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { cwd, exit } from "node:process";
import { createConsoleLogger, getChalk, SILENT_LOGGER } from "@open-pioneer/cli-common";
import { Command } from "commander";
import { version } from "../package.json";
import { createLicenseReport } from "./createLicenseReport";

const program = new Command();
program
    .name("create-license-report")
    .description("Creates an HTML license report for the dependencies of a project.")
    .option("-w, --working-dir <path>", "project directory (defaults to the current directory)")
    .option("-c, --config <path>", "path to the license config file", "support/license-config.yaml")
    .option("-o, --output <path>", "path to the generated report", "dist/license-report.html")
    .option("-q, --silent", "disable logging")
    .option("-d, --debug", "show exception stack traces")
    .version(version);
program.parse();

async function main() {
    const chalk = await getChalk();
    const opts = program.opts();
    const debug = opts.debug ?? false;
    const silent = opts.silent ?? false;
    try {
        const ok = await createLicenseReport({
            workingDir: opts.workingDir ?? cwd(),
            configPath: opts.config,
            outputHtmlPath: opts.output,
            logger: silent ? SILENT_LOGGER : await createConsoleLogger(console)
        });
        exit(ok ? 0 : 1);
    } catch (e) {
        if (debug) {
            console.error(e);
        } else {
            console.error(chalk.red((e as Error).message ?? String(e)));
            console.error("Run with --debug for more information.");
        }
        exit(1);
    }
}

main().catch((e) => {
    console.error("Fatal error", e);
    exit(1);
});
