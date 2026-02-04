// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, expect, it } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { TEMP_DATA_DIR } from "./testing/paths";
import { updateConfig } from "./updateConfig";
import { PackageEntry } from "./findDuplicates";

const UPDATE_CONFIG_DIR = resolve(TEMP_DATA_DIR, "update-config");

function makeDuplicates(
    entries: { name: string; versions: string[] }[]
): Map<string, PackageEntry> {
    const map = new Map<string, PackageEntry>();
    for (const entry of entries) {
        map.set(entry.name, entry);
    }
    return map;
}

beforeEach(() => {
    rmSync(UPDATE_CONFIG_DIR, { recursive: true, force: true });
    mkdirSync(UPDATE_CONFIG_DIR, { recursive: true });
});

it("updates an existing config with duplicates", () => {
    const configPath = resolve(UPDATE_CONFIG_DIR, "config.yaml");
    writeFileSync(configPath, `skipDevDependencies: true\nallowed:\n  - "old-package"\n`, "utf-8");

    const duplicates = makeDuplicates([
        { name: "prettier", versions: ["2.8.8", "3.3.3"] },
        { name: "@pnpm/dependency-path", versions: ["5.1.3", "5.1.6"] }
    ]);
    updateConfig(configPath, duplicates);

    const result = readFileSync(configPath, "utf-8");
    expect(result).toMatchInlineSnapshot(`
        "# Configuration file for check-pnpm-duplicates.
        # See https://www.npmjs.com/package/@open-pioneer/check-pnpm-duplicates for more details.
        skipDevDependencies: true
        allowed:
          - "@pnpm/dependency-path" # (versions 5.1.3, 5.1.6)
          - "prettier" # (versions 2.8.8, 3.3.3)
        "
    `);
});

it("creates a new config file when none exists", () => {
    const configPath = resolve(UPDATE_CONFIG_DIR, "new-config.yaml");

    const duplicates = makeDuplicates([{ name: "chalk", versions: ["2.4.2", "4.1.2"] }]);
    updateConfig(configPath, duplicates);

    const result = readFileSync(configPath, "utf-8");
    expect(result).toMatchInlineSnapshot(`
        "# Configuration file for check-pnpm-duplicates.
        # See https://www.npmjs.com/package/@open-pioneer/check-pnpm-duplicates for more details.
        allowed:
          - "chalk" # (versions 2.4.2, 4.1.2)
        "
    `);
});
