// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { beforeAll } from "vitest";
import { resolve } from "node:path";
import { cpSync } from "node:fs";
import { PROJECT_DIR, TEMP_PATH } from "./paths";

export function useTemporaryPnpmLockfile(): void {
    beforeAll(() => {
        cpSync(PROJECT_DIR, TEMP_PATH, { recursive: true, force: true });

        const packageJsonSrc = resolve(TEMP_PATH, "_package.json");
        const packageJsonDest = resolve(TEMP_PATH, "package.json");
        cpSync(packageJsonSrc, packageJsonDest, { recursive: true, force: true });

        const lockFileSrc = resolve(TEMP_PATH, "_pnpm-lock.yaml");
        const lockFileDest = resolve(TEMP_PATH, "pnpm-lock.yaml");
        cpSync(lockFileSrc, lockFileDest, { recursive: true, force: true });
    });
}
