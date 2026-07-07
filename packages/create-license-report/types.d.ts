// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

export interface LicenseOptions {
    dev: boolean;
    log: boolean;
    /** Path to the `license-config.yaml` file. */
    configPath: string;

    /** Path to the working directory of the project. Defaults to the package root. */
    workingDir: string;

    /** Output path for the generated HTML report. Defaults to `dist/license-report.html`. */
    outputHtmlPath: string;

    /** Ignore workspace for pnpm licenses */
    ignoreWorkspace?: boolean;
}

export function createLicense(options: LicenseOptions): Promise<void>;
