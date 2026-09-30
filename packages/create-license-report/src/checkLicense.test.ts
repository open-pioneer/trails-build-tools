// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";
import { checkLicense } from "./checkLicense";

const ALLOWED = ["Apache-2.0", "MIT"];

it("accepts a listed license", () => {
    expect(checkLicense("MIT", ALLOWED)).toBe("allowed");
});

it("rejects a license that is not listed", () => {
    expect(checkLicense("GPL-3.0-only", ALLOWED)).toBe("not-allowed");
});

it("reports a missing or unknown license", () => {
    expect(checkLicense(undefined, ALLOWED)).toBe("unknown");
    expect(checkLicense("", ALLOWED)).toBe("unknown");
    expect(checkLicense("Unknown", ALLOWED)).toBe("unknown");
});

it("accepts an AND expression if every license is allowed", () => {
    expect(checkLicense("MIT AND Apache-2.0", ALLOWED)).toBe("allowed");
});

it("rejects an AND expression if one license is not allowed", () => {
    expect(checkLicense("MIT AND GPL-3.0-only", ALLOWED)).toBe("not-allowed");
});

it("reports an OR expression as ambiguous even if one alternative is allowed", () => {
    expect(checkLicense("(GPL-3.0-only OR MIT)", ALLOWED)).toBe("ambiguous");
    expect(checkLicense("MIT AND (GPL-3.0-only OR ISC)", ALLOWED)).toBe("ambiguous");
});

it("accepts an OR expression listed verbatim", () => {
    expect(checkLicense("(GPL-3.0-only OR MIT)", [...ALLOWED, "(GPL-3.0-only OR MIT)"])).toBe(
        "allowed"
    );
});

it("accepts a non-SPDX license only if listed verbatim", () => {
    expect(checkLicense("UNLICENSED", ALLOWED)).toBe("not-allowed");
    expect(checkLicense("UNLICENSED", [...ALLOWED, "UNLICENSED"])).toBe("allowed");
});

it("still evaluates expressions when allowedLicenses contains entries that are not SPDX ids", () => {
    const allowed = [...ALLOWED, "(GPL-3.0-only OR MIT)", "UNLICENSED"];
    expect(checkLicense("MIT AND Apache-2.0", allowed)).toBe("allowed");
    expect(checkLicense("MIT AND GPL-3.0-only", allowed)).toBe("not-allowed");
});
