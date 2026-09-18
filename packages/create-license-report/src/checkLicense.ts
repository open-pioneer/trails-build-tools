// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import spdxExpressionParse from "spdx-expression-parse";
import spdxSatisfies from "spdx-satisfies";

/**
 * - `allowed`: the license may be used.
 * - `unknown`: pnpm could not detect a license.
 * - `ambiguous`: an `OR` expression that is not listed verbatim in `allowedLicenses`.
 *   It leaves the actual license choice open, so the user has to decide.
 * - `not-allowed`: the license is not covered by `allowedLicenses`.
 */
export type LicenseCheckResult = "allowed" | "unknown" | "ambiguous" | "not-allowed";

/**
 * Checks a license (as reported by pnpm or configured by the user) against the allowed licenses.
 *
 * A license listed verbatim in `allowedLicenses` is always allowed.
 * Otherwise it is evaluated as an SPDX expression, so `MIT AND ISC` requires both ids to be allowed.
 */
export function checkLicense(
    license: string | undefined,
    allowedLicenses: string[]
): LicenseCheckResult {
    if (!license || license === "Unknown") {
        return "unknown";
    }
    if (allowedLicenses.includes(license)) {
        return "allowed";
    }
    if (isOrExpression(license)) {
        return "ambiguous";
    }
    return satisfiesAllowedLicenses(license, allowedLicenses) ? "allowed" : "not-allowed";
}

function satisfiesAllowedLicenses(license: string, allowedLicenses: string[]): boolean {
    // spdx-satisfies throws when any allowed entry is not a single license id
    // (e.g. "UNLICENSED" or a verbatim OR expression), so those are left out of the evaluation.
    const allowedIds = allowedLicenses.filter(isSingleLicenseId);
    try {
        return spdxSatisfies(license, allowedIds);
    } catch {
        return false;
    }
}

function isSingleLicenseId(license: string): boolean {
    try {
        return !("conjunction" in spdxExpressionParse(license));
    } catch {
        return false;
    }
}

function isOrExpression(license: string): boolean {
    try {
        return containsOrConjunction(spdxExpressionParse(license));
    } catch {
        return false;
    }
}

function containsOrConjunction(info: spdxExpressionParse.Info): boolean {
    if (!("conjunction" in info)) {
        return false;
    }
    return (
        info.conjunction === "or" ||
        containsOrConjunction(info.left) ||
        containsOrConjunction(info.right)
    );
}
