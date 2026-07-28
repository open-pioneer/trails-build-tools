// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { createConsoleLogger, getChalk, SILENT_LOGGER } from "@open-pioneer/cli-logging";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { LicenseOptions } from "./types";
import { analyzeLicenses } from "./analyze-licenses";
import { readLicenseConfig } from "./license-config";
import { generateReportHtml } from "./license-report-template";
import { getPnpmLicenseReport } from "./pnpm-license-report";

export async function createLicenseReport(options: LicenseOptions) {
    const logger = options.log ? await createConsoleLogger(console) : SILENT_LOGGER;
    const chalk = await getChalk();
    logger.info(chalk.gray("Start creating license report"));

    const packageJsonPath = resolve(options.workingDir, "package.json");
    if (!existsSync(packageJsonPath)) {
        throw new Error(`package.json not found at: ${packageJsonPath}`);
    }
    const configPath = resolve(options.workingDir, options.configPath);
    if (!existsSync(configPath)) {
        throw new Error(`License config not found at: ${configPath}`);
    }
    const configPathDirectory = dirname(configPath);
    const outputHtmlPath = resolve(options.workingDir, options.outputHtmlPath);

    logger.info(
        chalk.gray(
            `Using license config from ${configPath}, package.json from ${packageJsonPath} and writing result to ${outputHtmlPath}`
        )
    );

    const config = readLicenseConfig(configPath);
    const projectName = getProjectName(packageJsonPath);

    const projects = await getPnpmLicenseReport(options.workingDir, !config.skipDevDependencies);

    const { error, items } = await analyzeLicenses(
        projects,
        config,
        configPathDirectory,
        options.log
    );

    items.sort((a, b) => a.name.localeCompare(b.name));

    mkdirSync(dirname(outputHtmlPath), { recursive: true });
    const reportHtml = generateReportHtml(projectName, items);
    writeFileSync(outputHtmlPath, reportHtml, "utf-8");

    if (error) {
        logger.error(chalk.red(`License report finished with errors.`));
        process.exit(1);
    }
    logger.info(
        chalk.gray(`License report finished successfully. Report written to ${outputHtmlPath}`)
    );
}

/**
 * Returns the project's name from the package.json file in the repository root.
 */
function getProjectName(path: string): string {
    try {
        const data: Record<string, unknown> = JSON.parse(readFileSync(path, "utf-8"));
        const name = data?.name;
        if (typeof name !== "string") {
            throw new Error(`'name' must be a string.`);
        }
        return name;
    } catch (e) {
        throw new Error(`Failed to read project name from package.json at ${path}: ${e}`);
    }
}
