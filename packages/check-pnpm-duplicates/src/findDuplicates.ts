// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { Lockfile } from "./readLockfile";
import { nameVerFromPkgSnapshot } from "@pnpm/lockfile.utils";
import { LockedDependency, lockfileWalker } from "@pnpm/lockfile.walker";

export interface PackageEntry {
    name: string;
    versions: string[];
}

/**
 * Returns duplicate package names and their versions.
 */
export async function findDuplicatePackages(
    lockfile: Lockfile,
    skipDevDependencies: boolean
): Promise<Map<string, PackageEntry>> {
    const seenPackages = new Map<string, PackageEntry>();
    const walker = lockfileWalker(lockfile, typedKeys(lockfile.importers), {
        include: {
            dependencies: true,
            optionalDependencies: true,
            devDependencies: !skipDevDependencies
        }
    });

    // Visit all transitive dependencies
    const visitDeps = (deps: LockedDependency[]) => {
        for (const dep of deps) {
            const { name, version } = nameVerFromPkgSnapshot(dep.depPath, dep.pkgSnapshot);
            let entry = seenPackages.get(name);
            if (!entry) {
                entry = { name, versions: [] };
                seenPackages.set(name, entry);
            }
            if (!entry.versions.includes(version)) {
                entry.versions.push(version);
                visitDeps(dep.next().dependencies);
            }
        }
    };
    visitDeps(walker.step.dependencies);

    // Only keep packages with more than one version
    for (const [name, entry] of seenPackages) {
        if (entry.versions.length < 2) {
            seenPackages.delete(name);
        } else {
            entry.versions.sort();
        }
    }
    return seenPackages;
}

function typedKeys<K extends string | symbol>(object: Record<K, unknown>): K[] {
    return Object.keys(object) as K[];
}
