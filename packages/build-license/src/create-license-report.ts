// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { LicenseOptions } from "../types";
import { createConsoleLogger, getChalk, SILENT_LOGGER } from "@open-pioneer/build-common";
import { generateReportHtml } from "./license-report-template";
import { readLicenseConfig } from "./license-config";
import { getPnpmLicenseReport } from "./pnpm-license-report";
import { analyzeLicenses, getAdditionalLicenses } from "./analyze-licenses";

/**
 * Generates a license report from the dependencies of this repository.
 * Should be invoked via `pnpm build-license-report` (or manually from the project root).
 *
 * The project name is read from the root `package.json` file.
 *
 * Outputs an html file to `dist/license-report.html`.
 */

export async function createLicenseFile(options: LicenseOptions) {
    const logger = options.log ? await createConsoleLogger(console) : SILENT_LOGGER;
    const chalk = await getChalk();
    logger.info(chalk.gray("Start creating license report"));

    const callerDir = process.cwd();

    const packageJsonPath = resolve(callerDir, options.packageJsonPath);
    if (!existsSync(packageJsonPath)) {
        throw new Error(`package.json not found at: ${packageJsonPath}`);
    }
    const configPath = resolve(callerDir, options.configPath);
    if (!existsSync(configPath)) {
        throw new Error(`License config not found at: ${configPath}`);
    }
    const configPathFolder = dirname(configPath);
    const outputHtmlPath = resolve(callerDir, options.outputHtmlPath);

    logger.info(
        chalk.gray(
            `Using license config from ${configPath} , packagejson from ${packageJsonPath} and write the result into ${outputHtmlPath}`
        )
    );

    const config = readLicenseConfig(configPath);
    const projectName = getProjectName(packageJsonPath);

    // Invoke pnpm to gather dependency information.
    const reportJson = await getPnpmLicenseReport();

    // Analyze licenses: find license information, handle configured overrides and print errors.
    const { error, items } = await analyzeLicenses(
        reportJson,
        config,
        configPathFolder,
        options.log
    );

    // Add `additionalLicenses`
    const { additionalError, additionalItems } = await getAdditionalLicenses(
        config,
        items.length,
        configPathFolder,
        options.log
    );
    const allItems = items.concat(additionalItems);
    const allError = error || additionalError;

    allItems.sort((a, b) => {
        return a.name.localeCompare(b.name, "en-US");
    });

    // Ensure directory exists, then write the report
    mkdirSync(dirname(outputHtmlPath), {
        recursive: true
    });
    const reportHtml = generateReportHtml(projectName, allItems);
    writeFileSync(outputHtmlPath, reportHtml, "utf-8");

    if (allError) {
        logger.error(chalk.red(`License report finished with errors.`));
        process.exit(1);
    }
    logger.info(
        chalk.gray(`License report finished successfully. Report written to ${outputHtmlPath}`)
    );
    process.exit(0);
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
