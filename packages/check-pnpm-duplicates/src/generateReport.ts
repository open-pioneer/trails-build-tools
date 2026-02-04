// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { formatPackageEntries, PackageEntry } from "./findDuplicates";
import { Config, ConfigRule } from "./readConfig";

/**
 * Prints a report for the given configuration and package duplicates.
 *
 * Returns true if the program can exit with a successful status code, false otherwise.
 */
export function generateReport(config: Config, duplicates: Map<string, PackageEntry>): boolean {
    const unexpectedPackages = getUnexpectedDuplicates(config, duplicates);
    const unusedRules = getUnusedRules(config);

    if (unexpectedPackages.length > 0) {
        console.error(`Found unexpected duplicate packages:`);
        console.error(formatPackageEntries(unexpectedPackages));

        console.error(``);
        console.error(`To resolve these issues, consider taking one of the following steps:`);
        console.error(`  - Run 'pnpm dedupe'`);
        console.error(
            `  - Investigate why the package is duplicated (try running 'pnpm why -r <package>') and try to resolve the duplication.`
        );
        console.error(
            `  - If the duplication is not a problem, add the package to the allowed list in the configuration file.`
        );
    } else {
        console.log(`No unexpected duplicate packages found.`);
    }

    if (unusedRules.length) {
        console.warn(``);
        console.warn(
            `The following rules did not match any packages. They can be removed from the configuration file:`
        );
        for (const rule of unusedRules) {
            console.warn(`  - ${rule.allowedPackageName}`);
        }
    }

    return unexpectedPackages.length === 0;
}

function getUnexpectedDuplicates(
    config: Config,
    duplicates: Map<string, PackageEntry>
): PackageEntry[] {
    const unexpectedPackages: PackageEntry[] = [];
    for (const entry of duplicates.values()) {
        const allowed = config.rules.find((rule) => {
            if (rule.allowedPackageName === entry.name) {
                rule.matched = true;
                return true;
            } else {
                return false;
            }
        });
        if (!allowed) {
            unexpectedPackages.push(entry);
        }
    }

    // Sort by package name
    unexpectedPackages.sort((v1, v2) => {
        return v1.name.localeCompare(v2.name);
    });
    return unexpectedPackages;
}

function getUnusedRules(config: Config): ConfigRule[] {
    const rules = config.rules.filter((rule) => !rule.matched);
    // Sort by package name
    rules.sort((v1, v2) => {
        return v1.allowedPackageName.localeCompare(v2.allowedPackageName);
    });
    return rules;
}
