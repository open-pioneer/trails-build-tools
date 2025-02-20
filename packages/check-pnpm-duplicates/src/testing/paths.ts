// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { cpSync, existsSync, renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_DIR = resolve(fileURLToPath(import.meta.url), "../../..");
export const TEST_DATA_DIR = resolve(PACKAGE_DIR, "test-data");
export const TEMP_DATA_DIR = resolve(PACKAGE_DIR, "temp");

const PACKAGE_JSON_FILE = resolve(PACKAGE_DIR, "package.json");
if (!existsSync(PACKAGE_JSON_FILE)) {
    throw new Error(`No package.json in current directory. Fix path.`);
}

export function prepareLockfileDir(srcDirName: string, targetDirName: string) {
    const srcDirectory = resolve(TEST_DATA_DIR, srcDirName);
    const targetDirectory = resolve(TEMP_DATA_DIR, targetDirName);
    rmSync(targetDirectory, { recursive: true, force: true });
    cpSync(srcDirectory, targetDirectory, { recursive: true });
    renameSync(
        resolve(targetDirectory, "_pnpm-lock.yaml"),
        resolve(targetDirectory, "pnpm-lock.yaml")
    );
    return targetDirectory;
}
