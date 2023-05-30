// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { gte, parse, Range } from "semver";

/**
 * Returns `true` if the current version of the parser is compatible with the given `serializedVersion`.
 *
 * Given the two versions, the following attempts to parse will succeed:
 *
 * - serializedVersion is a newer patch release compatible with currentVersion
 * - serializedVersion is an older release in the same major version than currentVersion
 *
 * All other versions are incompatible as they might either be from an incompatible major version
 * or from a new minor version that introduces new, required features.
 */
export function canParse(currentVersion: string, serializedVersion: string) {
    const currentSemver = parse(currentVersion);
    if (!currentSemver) {
        throw new Error("Internal error: invalid current version");
    }
    const currentMinor = new Range("~" + currentVersion);

    const serializedSemver = parse(serializedVersion);
    if (!serializedSemver) {
        throw new Error(
            `Serialized metadata version is invalid: '${serializedVersion}'. Expected a valid semver.`
        );
    }

    // If we're newer than the serialized version (but still in the same major) then we can read it without problem.
    if (currentSemver.major === serializedSemver.major && gte(currentSemver, serializedSemver)) {
        return true;
    }

    // Otherwise, we can read patch releases within the same minor, even if the serialized data is newer than our version.
    return currentMinor.test(serializedSemver);
}
