// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";
import { PackageMetadataV1 } from "../packageMetadata";
import { verifyBuildConfig } from "./verifyBuildConfig";

// oxlint-disable-next-line vitest/expect-expect
it("allows valid values", () => {
    verifyBuildConfig({ styles: "foo" });
});

it("throws for invalid values", () => {
    expect(() => verifyBuildConfig({ styles: 2 })).toThrowErrorMatchingInlineSnapshot(
        `[ZodValidationError: Validation error: Expected string, received number at "styles"]`
    );
});

it("throws for invalid parameter names", () => {
    expect(() =>
        verifyBuildConfig({ notValidParameterName: 2 })
    ).toThrowErrorMatchingInlineSnapshot(
        `[ZodValidationError: Validation error: Unrecognized key(s) "notValidParameterName" in object]`
    );
});

// oxlint-disable-next-line vitest/expect-expect
it.each(PackageMetadataV1.MINOR_VERSIONS)("supports target version '%s'", (minor) => {
    verifyBuildConfig({
        publishConfig: {
            packageFormatTarget: minor
        }
    });
});

it("rejects invalid target version", () => {
    expect(() =>
        verifyBuildConfig({
            publishConfig: {
                packageFormatTarget: "99.99"
            }
        })
    ).toThrow(/publishConfig.packageFormatTarget/);
});

// oxlint-disable-next-line vitest/expect-expect
it("allow runtimeMeta", () => {
    const metaRuntimeConfig = {
        runtimeMeta: {
            metadataVersion: "1.0.0"
        }
    };
    verifyBuildConfig(metaRuntimeConfig);
});
