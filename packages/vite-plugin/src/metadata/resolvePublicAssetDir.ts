// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { realpath, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { PublicAssetConfig } from "@open-pioneer/build-common";
import { findDepPkgJsonPath } from "vitefu";
import { ReportableError } from "../ReportableError";
import { ResolvedPublicAssetDir } from "./Metadata";

/**
 * Resolves one public asset directory of the package in `packageDir` to an absolute real path.
 */
export async function resolvePublicAssetDir(
    packageName: string,
    packageDir: string,
    entry: PublicAssetConfig
): Promise<ResolvedPublicAssetDir> {
    let path: string;
    let src: string;
    switch (entry.type) {
        case "local":
            src = entry.src;
            path = resolve(packageDir, entry.src);
            break;
        case "package": {
            src = `${entry.packageName}/${entry.path}`;
            const packageJsonPath = await findDepPkgJsonPath(
                entry.packageName,
                join(packageDir, "package.json")
            );
            if (!packageJsonPath) {
                throw new ReportableError(
                    `Failed to find package '${entry.packageName}' for the public asset directory '${src}' of package '${packageName}'.` +
                        ` Is the dependency installed correctly?`
                );
            }
            path = resolve(dirname(packageJsonPath), entry.path);
            break;
        }
    }

    let directory: string;
    try {
        directory = await realpath(path);
    } catch (e) {
        const problem = isNotFoundError(e) ? "does not exist" : "cannot be read";
        throw new ReportableError(
            `The public asset directory '${src}' of package '${packageName}' ${problem}: ${path}`,
            { cause: e }
        );
    }

    const stats = await stat(directory);
    if (!stats.isDirectory()) {
        throw new ReportableError(
            `The public asset directory '${src}' of package '${packageName}' is not a directory: ${directory}`
        );
    }
    return { directory, dest: entry.dest };
}

function isNotFoundError(e: unknown): boolean {
    return e instanceof Error && "code" in e && e.code === "ENOENT";
}
