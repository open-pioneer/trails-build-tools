// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_DIR = resolve(fileURLToPath(import.meta.url), "../../..");
export const TEST_DATA_DIR = resolve(PACKAGE_DIR, "test-data");
const TEMP_DATA_DIR = resolve(PACKAGE_DIR, "temp");

const PACKAGE_JSON_FILE = resolve(PACKAGE_DIR, "package.json");
if (!existsSync(PACKAGE_JSON_FILE)) {
    throw new Error(`No package.json in current directory. Fix path.`);
}

/**
 * Returns the temporary directory reserved for the given test file, e.g.
 * `temp/buildDts` for `buildDts.test.ts`. Call it as `tempDirForTest(import.meta.url)`.
 *
 * Tests that generate declaration files must not share a directory with other test files:
 * declaration generation pulls in _all_ files matched by the surrounding `tsconfig.json`.
 */
export function tempDirForTest(testFileUrl: string): string {
    const testName = basename(fileURLToPath(testFileUrl)).replace(/\.test\.tsx?$/, "");
    return resolve(TEMP_DATA_DIR, testName);
}
