// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { runPnpm } from "@open-pioneer/cli-common";

/**
 * A dependency as reported by `pnpm list --json`.
 */
export interface PnpmDependency {
    /** The actual package name (differs from the key in the parent map for aliased dependencies). */
    from: string;

    /** The resolved version. Workspace packages use `link:<path>`. */
    version: string;

    /**
     * Transitive dependencies.
     * pnpm expands the dependencies of a package version only the first time it is encountered.
     */
    dependencies?: Record<string, PnpmDependency>;
}

/**
 * A workspace project as reported by `pnpm list --json`.
 */
export interface PnpmProject {
    name?: string;
    path: string;
    dependencies?: Record<string, PnpmDependency>;
    devDependencies?: Record<string, PnpmDependency>;
    optionalDependencies?: Record<string, PnpmDependency>;
}

/**
 * Lists all packages in the lockfile of the given directory (including transitive dependencies)
 * by invoking `pnpm list`.
 *
 * All projects of the workspace are included.
 */
export async function listPackages(
    directory: string,
    skipDevDependencies: boolean
): Promise<PnpmProject[]> {
    if (!existsSync(resolve(directory, "pnpm-lock.yaml"))) {
        throw new Error(`Failed to find a lockfile in ${directory}`);
    }

    const args = ["list", "--recursive", "--json", "--depth=Infinity", "--lockfile-only"];
    if (skipDevDependencies) {
        args.push("--prod");
    }
    const { stdout } = await runPnpm(directory, args);
    return JSON.parse(stdout) as PnpmProject[];
}
