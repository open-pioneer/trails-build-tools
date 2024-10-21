// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { Lockfile, readWantedLockfile } from "@pnpm/lockfile-file";

export type { Lockfile };

/**
 * Reads a pnpm lockfile from the given directory.
 */
export async function readLockfile(directory: string): Promise<Lockfile> {
    const lockFile = await readWantedLockfile(directory, {
        ignoreIncompatible: false
    });
    if (!lockFile) {
        throw new Error(`Failed to find a lockfile in ${directory}`);
    }
    return lockFile;
}
