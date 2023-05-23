// SPDX-FileCopyrightText: con terra GmbH and contributors
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
