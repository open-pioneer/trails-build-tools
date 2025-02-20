// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { Command } from "commander";
import { cwd, exit } from "node:process";
import { version } from "../package.json";
import { build } from "@open-pioneer/build-package";

const program = new Command();
program
    .name("build-pioneer-package")
    .description("Builds an Open Pioneer Trails package for publishing.")
    .option("-p, --package <path>", "package directory (defaults to current directory)")
    .option("-r, --root <path>", "the root directory (optional, defaults to the workspace root)")
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
    const rootDirectory = opts.root;
    try {
        await build({
            packageDirectory: packagePath,
            rootDirectory,
            logger: silent ? null : console
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
