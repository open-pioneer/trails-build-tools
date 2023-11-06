// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { getExtension } from "./pathUtils";

export type ResolveResult =
    | { type: "success"; path: string }
    | { type: "error"; kind: "ambiguous"; extensions: string[] }
    | { type: "error"; kind: "not-found" };

/**
 * Attempts to resolve the given (partial) path to an existing file.
 *
 * The lookup is performed with all of the extensions listed in `supportedExtensions`.
 *
 * The match must be unique, i.e. there must not be multiple candidates matching the path.
 */
export function resolveWithExtensions(path: string, supportedExtensions: string[]): ResolveResult {
    if (existsSync(path)) {
        return { type: "success", path };
    }

    if (supportedExtensions.includes(getExtension(path))) {
        return { type: "error", kind: "not-found" };
    }

    let match;
    const extensionMatches: string[] = [];
    for (const ext of supportedExtensions) {
        const fileAttempt = path + ext;
        if (existsSync(fileAttempt)) {
            extensionMatches.push(ext);
            match ??= fileAttempt;
        }
    }
    if (extensionMatches.length > 1) {
        return {
            type: "error",
            kind: "ambiguous",
            extensions: extensionMatches
        };
    }
    if (match) {
        return {
            type: "success",
            path: match
        };
    }
    return {
        type: "error",
        kind: "not-found"
    };
}

/**
 * Like {@link resolveWithExtensions}, but an ambiguous match is not a problem: it simply
 * takes the first match.
 */
export function resolveFirstMatchWithExtensions(
    path: string,
    supportedExtensions: string[]
): string | undefined {
    const result = resolveWithExtensions(path, supportedExtensions);
    if (result.type === "error" && result.kind === "ambiguous") {
        return path + result.extensions[0];
    }
    if (result.type === "error") {
        return undefined;
    }
    return result.path;
}
