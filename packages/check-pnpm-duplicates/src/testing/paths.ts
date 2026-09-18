// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import {
    cpSync,
    existsSync,
    mkdirSync,
    readFileSync,
    renameSync,
    rmSync,
    writeFileSync
} from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";

export const PACKAGE_DIR = resolve(fileURLToPath(import.meta.url), "../../..");
export const TEST_DATA_DIR = resolve(PACKAGE_DIR, "test-data");
export const TEMP_DATA_DIR = resolve(PACKAGE_DIR, "temp");

const PACKAGE_JSON_FILE = resolve(PACKAGE_DIR, "package.json");
if (!existsSync(PACKAGE_JSON_FILE)) {
    throw new Error(`No package.json in current directory. Fix path.`);
}

/**
 * Copies the test lockfile from `test-data/<srcDirName>` to `temp/<targetDirName>`
 * and creates a minimal workspace around it so that `pnpm list` picks up all projects.
 */
export function setupPnpmWorkspace(srcDirName: string, targetDirName: string) {
    const srcDirectory = resolve(TEST_DATA_DIR, srcDirName);
    const targetDirectory = resolve(TEMP_DATA_DIR, targetDirName);
    rmSync(targetDirectory, { recursive: true, force: true });
    cpSync(srcDirectory, targetDirectory, { recursive: true });
    renameSync(
        resolve(targetDirectory, "_pnpm-lock.yaml"),
        resolve(targetDirectory, "pnpm-lock.yaml")
    );
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
