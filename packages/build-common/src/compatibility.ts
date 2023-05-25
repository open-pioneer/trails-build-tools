// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { gte, parse, Range } from "semver";

/**
 * Returns `true` if the current version of the parser is compatible with the given `serializedVersion`.
 */
export function canSupportAsReader(currentVersion: string, serializedVersion: string) {
    const currentSemver = parse(currentVersion);
    const currentMinor = new Range("~" + currentVersion);
    if (!currentSemver || !currentMinor) {
        throw new Error("Internal error: invalid current version");
    }

    const serializedSemver = parse(serializedVersion);
    if (!serializedSemver) {
        throw new Error(
            `Serialized metadata version is invalid: ${serializedVersion}. Expected a valid semver.`
        );
    }

    // If we're newer than the serialized version (but still in the same major) then we can read it without problem.
    if (currentSemver.major === serializedSemver.major && gte(currentSemver, serializedSemver)) {
        return true;
    }

    // Otherwise, we can read patch releases within the same minor, even if the serialized data is newer than our version.
    return currentMinor.test(serializedSemver);
}
