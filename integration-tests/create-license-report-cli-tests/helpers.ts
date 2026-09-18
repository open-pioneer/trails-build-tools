// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { cpSync } from "node:fs";
import { resolve } from "node:path";
import { $, usePowerShell } from "zx";
import { PROJECT_DIR, TEMP_PATH } from "./paths";

if (process.platform === "win32") {
    usePowerShell();
}

/**
 * Copies the fixture project to `temp/` and installs it there.
 * The CLI reads the license information from the resulting `node_modules` via `pnpm licenses list`.
 */
export async function setupTestProject(): Promise<void> {
    cpSync(PROJECT_DIR, TEMP_PATH, { recursive: true, force: true });

    const packageJsonSrc = resolve(TEMP_PATH, "_package.json");
    const packageJsonDest = resolve(TEMP_PATH, "package.json");
    cpSync(packageJsonSrc, packageJsonDest, { recursive: true, force: true });

    const lockFileSrc = resolve(TEMP_PATH, "_pnpm-lock.yaml");
    const lockFileDest = resolve(TEMP_PATH, "pnpm-lock.yaml");
    cpSync(lockFileSrc, lockFileDest, { recursive: true, force: true });

    // All dependencies are `file:` dependencies, so no network access is needed.
    const shell = $({ cwd: TEMP_PATH });
    await shell`pnpm install --offline`.quiet();
}
