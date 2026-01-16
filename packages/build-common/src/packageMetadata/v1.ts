// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
/**
 * This module contains the description for version 1.x of the serialized metadata format.
 * After the initial release, only compatible changes can be made:
 *
 * ## On compatibility
 *
 * - **Backwards compatibility** (Reader newer than writer)
 *
 *   Packages compiled with an old version of the tool chain _must_ be loadable in a setup
 *   using newer versions of the toolchain.
 *   If new properties were introduced in the meantime, the toolchain should assume sensible defaults.
 *
 *   If this condition can no longer be maintained, a new _major_ version of the package format must be created.
 *   Changes of this nature should be avoided: they either force packages to be updated or they require the toolchain
 *   to maintain support for older versions.
 *
 * - **Forwards compatibility** (Writer newer than reader)
 *
 *   Packages compiled with a new version of the tool chain _must_ be loadable in a setup
 *   using an older version of the toolchain.
 *
 *   If that is no longer possible to maintain, a new minor version of the package format must be published.
 *   This is rather easy to 'heal' since the project developer can just update to a new version of the toolchain
 *   of the same major version.
 *
 * ## Rules
 *
 * - Backwards: The reader for metadata version 1.x.\_ must be able to read metadata version 1.y.\_ if x >= y.
 * - Forwards: The reader for metadata version 1.x.y must also be able to read metadata version 1.x.z if z >= y.
 *
 *
 * @module
 */
import type { PackageMetadataV1 as V1 } from "../../types";
import { canParse } from "./versionUtils";
import { z } from "zod";
import { CURRENT_RUNTIME_VERSION } from "../buildConfig";

export const CURRENT_VERSION = "1.0.0";

/* NOTE: do not use .strict() for objects here to allow future additions of optional properties */

const VERSION_FIELD = "packageFormatVersion";
const RUNTIME_FIELD = "runtimeVersion";

const VERSION_SCHEMA = z.object({
    [VERSION_FIELD]: z.string()
});

const PROPERTY_CONFIG_SCHEMA: z.ZodType<V1.PropertyConfig> = z.object({
    propertyName: z.string(),
    value: z.any().nullish().optional(),
    required: z.boolean().nullish().optional()
});

const REFERENCE_CONFIG_SCHEMA = z.object({
    type: z.enum(["all", "unique"] as const),
    referenceName: z.string(),
    interfaceName: z.string(),
    qualifier: z.string().nullish().optional()
}) satisfies z.ZodType<V1.ReferenceConfig>;

const UI_CONFIG_SCHEMA: z.ZodType<V1.UiConfig> = z.object({
    references: REFERENCE_CONFIG_SCHEMA.omit({ referenceName: true }).array()
});

const I18N_CONFIG_SCHEMA: z.ZodType<V1.I18nConfig> = z.object({
    languages: z.string().array().optional()
});

const PROVIDES_CONFIG_SCHEMA: z.ZodType<V1.ProvidesConfig> = z.object({
    interfaceName: z.string(),
    qualifier: z.string().nullish().optional()
});

const SERVICE_CONFIG_SCHEMA: z.ZodType<V1.ServiceConfig> = z.object({
    serviceName: z.string(),
    provides: PROVIDES_CONFIG_SCHEMA.array().nullish().optional(),
    references: REFERENCE_CONFIG_SCHEMA.array().nullish().optional()
});

const PACKAGE_METADATA_SCHEMA: z.ZodType<V1.PackageMetadata> = VERSION_SCHEMA.extend({
    services: SERVICE_CONFIG_SCHEMA.array().nullish().optional(),
    servicesModule: z.string().nullish().optional(),
    styles: z.string().nullish().optional(),
    i18n: I18N_CONFIG_SCHEMA.nullish().optional(),
    ui: UI_CONFIG_SCHEMA.nullish().optional(),
    properties: PROPERTY_CONFIG_SCHEMA.array().nullish().optional(),
    runtimeVersion: z.string().optional()
});

export const parsePackageMetadata: typeof V1.parsePackageMetadata = (jsonValue) => {
    // Require that at least the version field is present.
    const versionResult = VERSION_SCHEMA.safeParse(jsonValue);
    if (!versionResult.success) {
        return {
            type: "error",
            code: "validation-error",
            message: `Expected a json object with a valid value for '${VERSION_FIELD}'.`,
            cause: versionResult.error
        };
    }

    // Check whether the version is supported.
    const serializedVersion = versionResult.data[VERSION_FIELD];
    try {
        if (!canParse(CURRENT_VERSION, serializedVersion)) {
            return {
                type: "error",
                code: "unsupported-version",
                message: `The version of this package cannot read framework metadata of version ${serializedVersion}.`
            };
        }
    } catch (e) {
        // Invalid version
        return {
            type: "error",
            code: "unsupported-version",
            message: `Cannot determine support status of framework metadata version ${serializedVersion}.`,
            cause: e
        };
    }

    // Validate the rest now that we know that we're compatible.
    const metadataResult = PACKAGE_METADATA_SCHEMA.safeParse(jsonValue);
    if (!metadataResult.success) {
        return {
            type: "error",
            code: "validation-error",
            message: "Metadata validation failed.",
            cause: metadataResult.error
        };
    }
    const serializedRuntimeVersion = metadataResult.data[RUNTIME_FIELD];
    if (serializedRuntimeVersion) {
        // Check whether the runtime version is supported.
        try {
            if (!canParse(CURRENT_RUNTIME_VERSION, serializedRuntimeVersion)) {
                return {
                    type: "error",
                    code: "unsupported-runtime-version",
                    message: `The current version of the runtime cannot support version ${serializedRuntimeVersion} required by this package.`
                };
            }
        } catch (e) {
            // Invalid version
            return {
                type: "error",
                code: "unsupported-runtime-version",
                message: `Cannot determine support status of runtime version ${serializedRuntimeVersion}.`,
                cause: e
            };
        }
    }

    return {
        type: "success",
        value: metadataResult.data
    };
};

export const serializePackageMetadata: typeof V1.serializePackageMetadata = (
    metadata: V1.OutputPackageMetadata & Partial<Pick<V1.PackageMetadata, typeof VERSION_FIELD>>
) => {
    if (metadata[VERSION_FIELD] != null && metadata[VERSION_FIELD] !== CURRENT_VERSION) {
        throw new Error(
            `Invalid package metadata version '${metadata[VERSION_FIELD]}': ` +
                `version should either be omitted or be equal to the current version.`
        );
    }

    const augmentedMetadata: V1.PackageMetadata = {
        ...metadata,
        [VERSION_FIELD]: CURRENT_VERSION
    };

    // Sanity check: pass our own validation.
    const finalMetadata = JSON.parse(JSON.stringify(augmentedMetadata));
    try {
        PACKAGE_METADATA_SCHEMA.parse(augmentedMetadata);
    } catch (e) {
        throw new Error(`Failed to validate framework metadata before writing`, { cause: e });
    }
    return finalMetadata;
};
