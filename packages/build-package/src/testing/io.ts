// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from "fs";
import { rm } from "node:fs/promises";

export function readText(path: string) {
    return readFileSync(path, "utf-8");
}

export async function cleanDir(path: string): Promise<void> {
    await rm(path, { recursive: true, force: true });
}
