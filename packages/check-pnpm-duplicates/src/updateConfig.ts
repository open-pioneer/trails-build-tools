// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { formatPackageEntries, PackageEntry } from "./findDuplicates";
import { maybeReadRawConfig } from "./readConfig";

/**
 * Updates the `allowed` field in the given YAML config file
 * with the current set of duplicate packages.
 */
export function updateConfig(configPath: string, duplicates: Map<string, PackageEntry>): void {
    const existingConfig = maybeReadRawConfig(configPath);
    mkdirSync(dirname(configPath), { recursive: true });
    const entries = [...duplicates.values()].sort((v1, v2) => v1.name.localeCompare(v2.name));
    const lines: string[] = [
        "# Configuration file for check-pnpm-duplicates.",
        "# See https://www.npmjs.com/package/@open-pioneer/check-pnpm-duplicates for more details.",
        existingConfig.skipDevDependencies != null
            ? `skipDevDependencies: ${existingConfig.skipDevDependencies}`
            : "",
        entries.length > 0 ? `allowed:` : `allowed: []`,
        entries.length > 0 ? formatPackageEntries(entries) : ""
    ];
    const text = lines.filter(Boolean).join("\n") + "\n";
    writeFileSync(configPath, text, "utf-8");
}
