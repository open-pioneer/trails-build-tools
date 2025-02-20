// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_DIR = resolve(fileURLToPath(import.meta.url), "..");
export const TEST_DATA_DIR = resolve(PACKAGE_DIR, "test-data");
export const TEMP_DATA_DIR = resolve(PACKAGE_DIR, "temp");
export const SNAPSHOT_DIR = resolve(PACKAGE_DIR, "__snapshots");

const PACKAGE_JSON_FILE = resolve(PACKAGE_DIR, "package.json");
if (!existsSync(PACKAGE_JSON_FILE)) {
    throw new Error(`No package.json in current directory. Fix path.`);
}
