// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

/**
 * Serializes JSON data with sorted object keys, so that structurally equal values produce the same string.
 */
export function canonicalJson(value: unknown): string {
    switch (typeof value) {
        case "string":
        case "boolean":
            return JSON.stringify(value);
        case "number":
            if (!Number.isFinite(value)) {
                throw new Error(`Query params must be plain JSON data, got ${value}`);
            }
            return JSON.stringify(value);
        case "object":
            break;
        default:
            throw new Error(`Query params must be plain JSON data, got a ${typeof value}`);
    }

    if (value === null) {
        return "null";
    }
    if (Array.isArray(value)) {
        return "[" + value.map((item) => canonicalJson(item ?? null)).join(",") + "]";
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
        const name = (value as object).constructor?.name || "an unknown class";
        throw new Error(`Query params must be plain JSON data, got an instance of ${name}`);
    }

    const members: string[] = [];
    for (const key of Object.keys(value).sort()) {
        const member = (value as Record<string, unknown>)[key];
        if (member !== undefined) {
            members.push(JSON.stringify(key) + ":" + canonicalJson(member));
        }
    }
    return "{" + members.join(",") + "}";
}
