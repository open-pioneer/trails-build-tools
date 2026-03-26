// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, readFileSync, writeFileSync } from "fs";
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
const THIS_DIR = resolve(dirname(fileURLToPath(import.meta.url)));
const PACKAGE_DIR = resolve(THIS_DIR, "..");
const PACKAGE_JSON_PATH = resolve(PACKAGE_DIR, "package.json");
const CONFIG_PATH = resolve(THIS_DIR, "license-config.yaml");
const OUTPUT_HTML_PATH = resolve(PACKAGE_DIR, "dist/license-report.html");

export async function createLicenseFile(options: LicenseOptions) {
    const logger = options.log ? await createConsoleLogger(console) : SILENT_LOGGER;
    const chalk = await getChalk();
    logger.info(chalk.gray("Start creating license"));

    const packageJsonPath = options.packageJsonPath ?? PACKAGE_JSON_PATH;
    //TODO remove fallback config_path
    const configPath = options.configPath ?? CONFIG_PATH;
    const outputHtmlPath = options.outputHtmlPath ?? OUTPUT_HTML_PATH;
    logger.info(
        chalk.gray(
            `Using config from ${configPath}, output into ${outputHtmlPath}, from ${packageJsonPath}`
        )
    );

    const config = readLicenseConfig(configPath);
    const projectName = getProjectName(packageJsonPath);

    // Invoke pnpm to gather dependency information.
    const reportJson = getPnpmLicenseReport();

    // Analyze licenses: find license information, handle configured overrides and print errors.
    const { error, items } = analyzeLicenses(reportJson, config, THIS_DIR);

    // Add `additionalLicenses`
    const { additionalError, additionalItems } = getAdditionalLicenses(config, items.length, THIS_DIR);
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

    // Signal error if anything went wrong
    process.exit(allError ? 1 : 0);
}

/**
 * Returns the project's name from the package.json file in the repository root.
 */
function getProjectName(path: string): string {
    let data: Record<string, unknown>;
    try {
        data = JSON.parse(readFileSync(path, "utf-8"));
    } catch (e) {
        throw new Error(`Failed to read package.json: ${e}`);
    }
    const name = data?.name;
    if (typeof name === "string") {
        return name;
    }
    throw new Error(`Failed to retrieve 'name' from package.json: it must be a string.`);
}
