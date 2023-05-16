// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Assumes tests invoked from package root
export const PACKAGE_DIR = resolve(fileURLToPath(import.meta.url), "../../..");
export const TEST_DATA_DIR = resolve(PACKAGE_DIR, "test-data");
export const TEMP_DATA_DIR = resolve(PACKAGE_DIR, "temp");

const PACKAGE_JSON_FILE = resolve(PACKAGE_DIR, "package.json");
if (!existsSync(PACKAGE_JSON_FILE)) {
    throw new Error(`No package.json in current directory. Fix path.`);
}
