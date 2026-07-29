// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { $, usePowerShell } from "zx";

if (process.platform === "win32") {
    usePowerShell();
}

export interface PnpmLicenseProject {
    /** Project name */
    name: string;

    /** Project version(s), same order as paths */
    versions: string[];

    /** Location(s) on disk, same order as versions */
    paths: string[];

    /** License (same as group key) in the original pnpm report */
    license: string;
}

interface PnpmLicensesReport {
    [license: string]: PnpmLicenseProject[];
}

/**
 * Invokes pnpm to list the licenses of all third party dependencies used by this repository.
 * Returns a flat list of all projects with their license information.
 */
export async function getPnpmLicenseReport(
    workspaceDirectory: string,
    devDependencies: boolean
): Promise<PnpmLicenseProject[]> {
    const shell = $({ cwd: workspaceDirectory });

    const args = ["licenses", "list", "--json", "--long"];
    if (!devDependencies) {
        args.push("-P");
    }

    const processOutputLicense = await shell`pnpm ${args}`;
    const report = parseJsonOutput<PnpmLicensesReport>(processOutputLicense.stdout);
    return Object.values(report).flat();
}

/**
 * Some tests, specially on Github, did not succeed if processOutputLicense.json was used directly.
 * So we parse `stdout` as JSON and tolerating warning lines. pnpm sometimes writes
 * to stdout before the actual JSON payload (e.g. npmrc env substitution warnings).
 */
function parseJsonOutput<T>(stdout: string): T {
    const jsonStart = stdout.indexOf("{");
    if (jsonStart === -1) {
        throw new Error(`Expected JSON output from pnpm, got: ${stdout}`);
    }
    return JSON.parse(stdout.slice(jsonStart)) as T;
}

/**
 * Yields all (path, version) pairs for the given project.
 */
export function* walkProjectLocations(
    project: PnpmLicenseProject
): Generator<{ path: string; version: string }> {
    const versions = project.versions;
    const paths = project.paths;
    if (paths.length !== versions.length) {
        throw new Error(
            `Project paths and versions returned by PNPM do not have the same length for project ${project.name}), indices of paths must correspond to that of versions.`
        );
    }

    for (let i = 0; i < versions.length; i++) {
        const path = paths[i];
        // Fix for tests: pnpm does not report a version for `file:`/`link:` dependencies, so fall back
        // to reading it from the package's own package.json.
        const version = versions[i] || (path && readVersionFromPackageJson(path));
        if (!version || !path) {
            throw new Error(
                `Paths or versions contains undefined entry for project ${project.name}), indices of paths must correspond to that of versions.`
            );
        }
        yield { path, version };
    }
}

function readVersionFromPackageJson(packagePath: string): string | undefined {
    try {
        const content = readFileSync(resolve(packagePath, "package.json"), "utf-8");
        return (JSON.parse(content) as { version?: string }).version;
    } catch {
        return undefined;
    }
}
