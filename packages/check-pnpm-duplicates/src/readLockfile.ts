// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { LockfileObject, readWantedLockfile } from "@pnpm/lockfile.fs";

export type { LockfileObject };

/**
 * Reads a pnpm lockfile from the given directory.
 */
export async function readLockfile(directory: string): Promise<LockfileObject> {
    const lockFile = await readWantedLockfile(directory, {
        ignoreIncompatible: false
    });
    if (!lockFile) {
        throw new Error(`Failed to find a lockfile in ${directory}`);
    }
    return lockFile;
}
