// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { Command } from "commander";
import { cwd, exit } from "node:process";
import { readLockfile } from "./readLockfile";
import { findDuplicatePackages } from "./findDuplicates";
import { version } from "../package.json";
import { emptyConfig, readConfig } from "./readConfig";
import { generateReport } from "./generateReport";

const program = new Command();
program
    .name("check-pnpm-duplicates")
    .description("Checks a pnpm lockfile for duplicate packages.")
    .option("-c, --config <path>", "path to the configuration file")
    .option("-d, --debug", "show exception stack traces")
    .version(version);
program.parse();

async function main() {
    const chalk = (await import("chalk")).default;
    const opts = program.opts();
    const configPath = opts.config as string | undefined;
    const debug = opts.debug ?? false;
    try {
        const directory = cwd();

        // Read user configuration
        const config = configPath ? readConfig(configPath) : emptyConfig();

        // Read pnpm lockfile
        let lockfile;
        try {
            lockfile = await readLockfile(directory);
        } catch (e) {
            throw new Error(`Failed to read lockfile in ${directory}`, { cause: e });
        }

        // Find duplicates
        let duplicates;
        try {
            duplicates = await findDuplicatePackages(lockfile, config.skipDevDependencies);
        } catch (e) {
            throw new Error(`Could not analyze lockfile for duplicates`, { cause: e });
        }

        // Report results
        const ok = generateReport(config, duplicates);
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
