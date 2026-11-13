// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

/**
 * Returns true if the package.json lists the package in its `dependencies` or `peerDependencies`.
 */
export function isDeclaredDependency(
    packageName: string,
    packageJson: Record<string, unknown>
): boolean {
    for (const field of ["dependencies", "peerDependencies"]) {
        const dependencies = packageJson[field];
        if (
            dependencies &&
            typeof dependencies === "object" &&
            Object.hasOwn(dependencies, packageName)
        ) {
            return true;
        }
    }
    return false;
}

/**
 * Returns the package name at the start of a path into a package,
 * for example `@scope/name` for `@scope/name/dist/index.js`.
 *
 * Returns undefined if the path does not start with a package name.
 */
export function parsePackageName(path: string): string | undefined {
    const pattern = path.startsWith("@") ? /^@[^/]+\/[^/]+/ : /^[^/]+/;
    return path.match(pattern)?.[0];
}
