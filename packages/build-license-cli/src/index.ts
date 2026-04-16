// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { Command } from "commander";
import { exit } from "node:process";
import { version } from "../package.json";
import { createLicense } from "@open-pioneer/build-license";

const LICENSE_CONFIG = "support/license-config.yaml";
const PACKAGE_JSON = "package.json";
const OUTPUT_HTML = "dist/license-report.html";

const program = new Command();
program
    .name("build-pioneer-license")
    .description("Create a license file for Open Pioneer Trails ")
    .option("-c, --config <path>", "path to the license config file", LICENSE_CONFIG)
    .option("-p, --packageJson <path>", "path to the package.json", PACKAGE_JSON)
    .option("-o, --output <path>", "path to the result file", OUTPUT_HTML)
    .option("-d, --dev", "include dev dependencies", false)
    .option("-q, --silent", "disable logging", false)
    .option("-x, --debug", "show exception stack traces", false)
    .version(version);
program.parse();

async function main() {
    const chalk = (await import("chalk")).default;
    const opts = program.opts();
    try {
        await createLicense({
            configPath: opts.config,
            packageJsonPath: opts.packageJson,
            outputHtmlPath: opts.output,
            dev: opts.dev,
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
