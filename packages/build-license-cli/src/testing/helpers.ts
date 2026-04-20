// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { afterAll, beforeAll } from "vitest";
import { resolve } from "node:path";
import { cpSync, existsSync, rmSync } from "node:fs";

export function useTemporaryPnpmLockfile(projectDir: string): void {
    beforeAll(() => {
        const sourceLockfile = resolve(projectDir, "_pnpm-lock.yaml");
        const targetLockfile = resolve(projectDir, "pnpm-lock.yaml");
        cpSync(sourceLockfile, targetLockfile, { recursive: true });
    });

    afterAll(() => {
        const targetLockfile = resolve(projectDir, "pnpm-lock.yaml");
        if (existsSync(targetLockfile)) {
            rmSync(targetLockfile);
        }
    });
}
