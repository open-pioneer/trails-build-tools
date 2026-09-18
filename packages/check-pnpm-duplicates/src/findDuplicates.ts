// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { PnpmDependency, PnpmProject } from "./pnpm";

export interface PackageEntry {
    name: string;
    versions: string[];
}

/**
 * Formats package entries as YAML list items with version comments, one per line.
 *
 * Example output:
 * ```
 *   - "@scope/pkg" # (versions 1.0.0, 2.0.0)
 *   - "other-pkg" # (versions 3.0.0, 4.0.0)
 * ```
 */
export function formatPackageEntries(entries: PackageEntry[]): string {
    return entries
        .map((entry) => {
            const versions = entry.versions.join(", ");
            return `  - ${JSON.stringify(entry.name)} # (versions ${versions})`;
        })
        .join("\n");
}

/**
 * Returns duplicate package names and their versions, sorted by package name.
 */
export function findDuplicatePackages(projects: PnpmProject[]): Map<string, PackageEntry> {
    const versionsByName = new Map<string, Set<string>>();
    const visit = (deps: Record<string, PnpmDependency> | undefined) => {
        for (const dep of Object.values(deps ?? {})) {
            const version = dep.version;

            // Skip linked packages (workspace packages or `link:` dependencies): they are not
            // installed copies. Workspace packages are listed as projects of their own anyway.
            //
            // Other dependency types need no special treatment: git and tarball dependencies are
            // reported with their resolved package version, aliases with their actual package
            // name (`from`) and `file:` dependencies with `file:<path>` as their version.
            if (!version.startsWith("link:")) {
                let versions = versionsByName.get(dep.from);
                if (!versions) {
                    versions = new Set();
                    versionsByName.set(dep.from, versions);
                }
                versions.add(version);
            }

            if (dep.dependencies) {
                visit(dep.dependencies);
            }
        }
    };
    for (const project of projects) {
        visit(project.dependencies);
        visit(project.devDependencies);
        visit(project.optionalDependencies);
    }

    const duplicates: PackageEntry[] = [];
    for (const [name, versions] of versionsByName) {
        if (versions.size > 1) {
            duplicates.push({ name, versions: [...versions].sort() });
        }
    }
    duplicates.sort((v1, v2) => v1.name.localeCompare(v2.name));
    return new Map(duplicates.map((entry) => [entry.name, entry]));
}
