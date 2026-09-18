// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runPnpm } from "@open-pioneer/cli-common";

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
 * Invokes `pnpm licenses list` to list the licenses of all dependencies installed in `directory`.
 * Returns a flat list of all projects with their license information.
 */
export async function getPnpmLicenseReport(
    directory: string,
    devDependencies: boolean
): Promise<PnpmLicenseProject[]> {
    const args = ["licenses", "list", "--json", "--long"];
    if (!devDependencies) {
        args.push("--prod");
    }

    let stdout;
    try {
        stdout = (await runPnpm(directory, args)).stdout;
    } catch (e) {
        throw new Error(`Failed to list the licenses in ${directory}: ${(e as Error).message}`, {
            cause: e
        });
    }
    const report = parseJsonOutput<PnpmLicensesReport>(stdout);
    return Object.values(report).flat();
}

/**
 * pnpm may print warnings (e.g. about missing env variables in `.npmrc`) to stdout before the JSON payload,
 * so everything up to the first `{` is skipped.
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
            `pnpm reported ${paths.length} paths but ${versions.length} versions for project '${project.name}'.`
        );
    }

    for (let i = 0; i < versions.length; i++) {
        const path = paths[i];
        if (!path) {
            throw new Error(`pnpm reported an empty path for project '${project.name}'.`);
        }
        const version = getVersion(versions[i], path);
        if (!version) {
            throw new Error(
                `Failed to determine the version of project '${project.name}' at ${path}.`
            );
        }
        yield { path, version };
    }
}

/**
 * For `file:` and `link:` dependencies, pnpm reports either no version (pnpm 11) or the
 * specifier itself (pnpm 12), so the version is read from the package's own package.json.
 */
function getVersion(reportedVersion: string | undefined, packagePath: string): string | undefined {
    if (reportedVersion && !/^(file|link):/.test(reportedVersion)) {
        return reportedVersion;
    }
    return readVersionFromPackageJson(packagePath);
}

function readVersionFromPackageJson(packagePath: string): string | undefined {
    try {
        const content = readFileSync(resolve(packagePath, "package.json"), "utf-8");
        return (JSON.parse(content) as { version?: string }).version;
    } catch {
        return undefined;
    }
}
