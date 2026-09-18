// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { load as loadYaml } from "js-yaml";
import { TEMP_DATA_DIR, TEST_DATA_DIR } from "./paths";

/**
 * Copies the test lockfile to `temp/<targetDirName>` and creates a minimal workspace around it.
 */
export function setupPnpmWorkspace(targetDirName: string): string {
    const sourceLockfile = resolve(TEST_DATA_DIR, "_pnpm-lock.yaml");
    const targetDirectory = resolve(TEMP_DATA_DIR, targetDirName);
    rmSync(targetDirectory, { recursive: true, force: true });
    mkdirSync(targetDirectory, { recursive: true });
    cpSync(sourceLockfile, resolve(targetDirectory, "pnpm-lock.yaml"));
    createWorkspaceLayout(targetDirectory);
    return targetDirectory;
}

// package.json files must exist for local projects.
function createWorkspaceLayout(directory: string) {
    const lockfile = loadYaml(readFileSync(resolve(directory, "pnpm-lock.yaml"), "utf-8")) as {
        importers: Record<string, unknown>;
    };
    const importers = Object.keys(lockfile.importers);
    for (const importer of importers) {
        const name = importer === "." ? "root" : basename(importer);
        mkdirSync(resolve(directory, importer), { recursive: true });
        writeFileSync(
            resolve(directory, importer, "package.json"),
            JSON.stringify({ name, private: true }, undefined, 4),
            "utf-8"
        );
    }
    const packages = importers.filter((importer) => importer !== ".");
    writeFileSync(
        resolve(directory, "pnpm-workspace.yaml"),
        `packages:\n${packages.map((pkg) => `  - ${JSON.stringify(pkg)}\n`).join("")}`,
        "utf-8"
    );
}
