// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { checkPnpmVersion, getChalk, type Logger } from "@open-pioneer/cli-common";
import { getPnpmLicenseReport } from "./pnpmLicenseReport";
import { readLicenseConfig } from "./readLicenseConfig";
import { generateReportHtml } from "./reportTemplate";
import { verifyLicenses } from "./verifyLicenses";

export interface CreateLicenseReportOptions {
    /** Directory of the project whose dependencies are reported. Must contain a `package.json`. */
    workingDir: string;

    /** Path to the `license-config.yaml` file, relative to `workingDir`. */
    configPath: string;

    /** Path of the generated HTML report, relative to `workingDir`. */
    outputHtmlPath: string;

    logger: Logger;
}

/**
 * Creates the license report for the project in `options.workingDir`.
 * The report is written even if some dependencies have problems, so it can be inspected.
 * Returns `false` in that case.
 */
export async function createLicenseReport(options: CreateLicenseReportOptions): Promise<boolean> {
    const { logger } = options;
    const chalk = await getChalk();
    logger.info(chalk.gray("Start creating license report"));

    const { packageJsonPath, configPath, configDirectory, outputHtmlPath } = createPaths(options);
    const projectName = getProjectName(packageJsonPath);
    logger.info(
        chalk.gray(
            `Using license config from ${configPath}, package.json from ${packageJsonPath} and writing result to ${outputHtmlPath}`
        )
    );

    const config = readLicenseConfig(configPath);
    await checkPnpmVersion(options.workingDir);
    const projects = await getPnpmLicenseReport(options.workingDir, !config.skipDevDependencies);
    const { ok, items } = verifyLicenses({ projects, config, configDirectory, logger });

    mkdirSync(dirname(outputHtmlPath), { recursive: true });
    writeFileSync(outputHtmlPath, generateReportHtml(projectName, items), "utf-8");

    if (!ok) {
        logger.error(`License report finished with errors. Report written to ${outputHtmlPath}`);
        return false;
    }
    logger.info(
        chalk.gray(`License report finished successfully. Report written to ${outputHtmlPath}`)
    );
    return true;
}

function createPaths(options: CreateLicenseReportOptions) {
    const packageJsonPath = resolve(options.workingDir, "package.json");
    if (!existsSync(packageJsonPath)) {
        throw new Error(`package.json not found at: ${packageJsonPath}`);
    }
    const configPath = resolve(options.workingDir, options.configPath);
    if (!existsSync(configPath)) {
        throw new Error(`License config not found at: ${configPath}`);
    }
    const configDirectory = dirname(configPath);
    const outputHtmlPath = resolve(options.workingDir, options.outputHtmlPath);
    return { packageJsonPath, configPath, configDirectory, outputHtmlPath };
}

function getProjectName(packageJsonPath: string): string {
    let data: Record<string, unknown>;
    try {
        data = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    } catch (e) {
        throw new Error(`Failed to read ${packageJsonPath}: ${e}`, { cause: e });
    }
    const name = data?.name;
    if (typeof name !== "string") {
        throw new Error(`Expected 'name' in ${packageJsonPath} to be a string.`);
    }
    return name;
}
