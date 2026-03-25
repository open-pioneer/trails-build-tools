// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { Command } from "commander";
import { exit } from "node:process";
import { version } from "../package.json";
import { createLicense } from "@open-pioneer/build-license";

const program = new Command();
program
    .name("create-pioneer-license")
    .description("Create a license file for Open Pioneer Trails ")
    .option("-d, --dev", "(optional, defaults is no dev dependency)")
    .option("-q, --silent", "disable logging")
    .option("-x, --debug", "show exception stack traces")
    .version(version);
program.parse();

async function main() {
    const chalk = (await import("chalk")).default;
    const opts = program.opts();
    const debug = opts.debug ?? false;
    const silent = opts.silent ?? false;
    const dev = opts.dev ?? false;
    try {
        await createLicense({
            dev,
            log: !silent
        });
        exit(0);
    } catch (e) {
        if (debug) {
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
