// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

// npm forbids "~" in package names, so it can stand for the "/" of a scoped name.
// It is unreserved in URLs and allowed in file names on all platforms.
// See also https://github.com/npm/validate-npm-package-name/blob/main/README.md#naming-rules.
const SCOPE_SEPARATOR = "~";

/**
 * Encodes a package name as a single URL path segment.
 *
 * - Unscoped package names are returned unchanged.
 * - Scoped package names are escaped to produce a single file name: `@scope/name` --> `scope~name`.
 */
export function packageNameToSlug(packageName: string): string {
    if (!packageName.startsWith("@")) {
        return packageName;
    }
    return packageName.slice(1).replace("/", SCOPE_SEPARATOR);
}

/**
 * Reverses {@link packageNameToSlug}.
 */
export function slugToPackageName(slug: string): string {
    if (!slug.includes(SCOPE_SEPARATOR)) {
        return slug;
    }
    return "@" + slug.replace(SCOPE_SEPARATOR, "/");
}
