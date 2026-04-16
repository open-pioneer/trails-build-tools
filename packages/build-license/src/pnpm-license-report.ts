// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { $ } from "zx";

export interface PnpmLicensesReport {
    [license: string]: PnpmLicenseProject[];
}

export interface PnpmLicenseProject {
    /** Project name */
    name: string;

    /** Project version(s), same order as paths */
    versions: string[];

    /** Location(s) on disk, same order as versions */
    paths: string[];

    /** License (same as group key) in {@link PnpmLicensesReport} */
    license: string;
}

/**
 * Invokes pnpm to list the licenses of all third party (production) dependencies used by this repository.
 */
export async function getPnpmLicenseReport(): Promise<PnpmLicensesReport> {
    const processOutputLicense = await $`pnpm licenses list --json --long -P`;
    return processOutputLicense.json();
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
        //the indices of paths corresponds to that of versions (https://github.com/pnpm/pnpm/pull/7528)
        throw new Error(
            `Project paths and versions returned by PNPM do not have the same length for project ${project.name}), indices of paths must correspond to that of versions.`
        );
    }

    for (let i = 0; i < versions.length; i++) {
        const path = paths[i];
        const version = versions[i];
        if (!version || !path) {
            throw new Error(
                `Paths or versions contains undefined entry for project ${project.name}), indices of paths must correspond to that of versions.`
            );
        }
        yield { path, version };
    }
}
