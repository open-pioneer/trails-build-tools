// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { Command } from "commander";
import { cwd, exit } from "node:process";
import { version } from "../package.json";
import { build } from "@open-pioneer/build-package";

const program = new Command();
program
    .description("Builds an open pioneer package for publishing.")
    .option("-p, --package <path>", "package directory (defaults to current directory)")
    .option("-q, --silent", "disable logging")
    .option("-d, --debug", "show exception stack traces")
    .version(version);
program.parse();

async function main() {
    const chalk = (await import("chalk")).default;
    const opts = program.opts();
    const debug = opts.debug ?? false;
    const silent = opts.silent ?? false;
    const packagePath = opts.package ?? cwd();
    try {
        await build({
            packageDirectory: packagePath,
            logger: silent ? null : console
        });
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
