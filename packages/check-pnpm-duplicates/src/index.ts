#!/usr/bin/env node
// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { cwd, exit } from "node:process";
import { checkPnpmVersion } from "@open-pioneer/cli-common";
import { Command } from "commander";
import { version } from "../package.json";
import { findDuplicatePackages } from "./findDuplicates";
import { generateReport } from "./generateReport";
import { listPackages } from "./pnpm";
import { emptyConfig, readConfig } from "./readConfig";
import { updateConfig } from "./updateConfig";

const program = new Command();
program
    .name("check-pnpm-duplicates")
    .description("Checks a pnpm lockfile for duplicate packages.")
    .option("-c, --config <path>", "path to the configuration file")
    .option("-d, --debug", "show exception stack traces")
    .option("-u, --update", "update the config file's allowed list with current duplicates")
    .version(version);
program.parse();

async function main() {
    const chalk = (await import("chalk")).default;
    const opts = program.opts();
    const configPath = opts.config as string | undefined;
    const debug = opts.debug ?? false;
    const update = opts.update ?? false;
    try {
        if (update && !configPath) {
            throw new Error("The --update flag requires a config file path (--config).");
        }

        const directory = cwd();

        // Read user configuration
        const config = configPath ? readConfig(configPath) : emptyConfig();

        await checkPnpmVersion(directory);

        // List all packages in the lockfile
        let projects;
        try {
            projects = await listPackages(directory, config.skipDevDependencies);
        } catch (e) {
            throw new Error(`Failed to list packages in ${directory}: ${(e as Error).message}`, {
                cause: e
            });
        }

        // Find duplicates
        const duplicates = findDuplicatePackages(projects);

        // Report results
        const ok = generateReport(config, duplicates);

        if (update && configPath) {
            updateConfig(configPath, duplicates);
            console.log(`Updated allowed list in ${configPath}`);
        }

        exit(update || ok ? 0 : 1);
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
