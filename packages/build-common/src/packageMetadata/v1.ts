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
 * ## Version history
 *
 * ### 1.1.0
 *
 * - Packages may now use the `open-pioneer:deployment` module.
 *   This import is passed through during package compilation and must be handled by the vite plugin at runtime.
 *
 * ### 1.0.1
 *
 * - New optional `runtimeMeta` field.
 *   This is used by `@open-pioneer/runtime` to indicate which version of app metadata it supports.
 *   It should not be used by other packages.
 *
 * ### 1.0.0
 *
 * Initial release
 *
 * @module
 */
import { SemVer } from "semver";
import { z } from "zod";
import { canParse } from "../versionUtils";

export type Nullish<T> = T | null | undefined;

/**
 * Helper type to express a set of statically known values (with autocompletion) that can still be extended.
 *
 * See this issue for more details: https://github.com/microsoft/TypeScript/issues/29729
 */
export type ExtensibleUnion<Values extends string> = Values | (string & {});

export interface RuntimeMeta {
    metadataVersion?: Nullish<string>;
}

/**
 * Framework metadata for a package.
 */
export interface PackageMetadata {
    /** Semantic version, 1.x.y */
    packageFormatVersion: string;

    /** Services in the package */
    services?: Nullish<ServiceConfig[]>;

    /** Services module to import. Required if there are any services. */
    servicesModule?: Nullish<string>;

    /** Styles to import, if the package comes with builtin CSS rules styles. */
    styles?: Nullish<string>;

    /** Languages and their messages defined by the package. */
    i18n?: Nullish<I18nConfig>;

    /** References etc. required by UI components. */
    ui?: Nullish<UiConfig>;

    /** Properties defined by the package. */
    properties?: Nullish<PropertyConfig[]>;

    /** Runtime package metadata. Only supported on the runtime package. */
    runtimeMeta?: Nullish<RuntimeMeta>;
}

/**
 * Same as {@link PackageMetadata}, but without the format version.
 * The format version is filled in automatically when writing metadata.
 */
export type OutputPackageMetadata = Omit<PackageMetadata, "packageFormatVersion">;

/**
 * Represents a service instance.
 */
export interface ServiceConfig {
    /** Name of the service. Service names are unique within a package. */
    serviceName: string;

    /** Interfaces provided by the service. */
    provides?: Nullish<ProvidesConfig[]>;

    /** References required by the service. */
    references?: Nullish<ReferenceConfig[]>;
}

/**
 * Represents an interface implemented by a service.
 */
export interface ProvidesConfig {
    /** Provided interface name. */
    interfaceName: string;

    /** Interface qualifier (optional). */
    qualifier?: Nullish<string>;
}

/**
 * Represents a reference required by a service.
 */
export interface ReferenceConfig {
    /** Requires all implementations of this interface or a unique implementation. */
    type: "all" | "unique";

    /** Name of the reference (injected as). Reference names are unique within a service. */
    referenceName: string;

    /** Required interface name. */
    interfaceName: string;

    /** Interface qualifier (optional). */
    qualifier?: Nullish<string>;
}

export type UiReferenceConfig = Omit<ReferenceConfig, "referenceName">;

/**
 * Represents supported languages of a package.
 */
export interface I18nConfig {
    /** Supported languages. */
    languages?: Nullish<string[]>;
}

/**
 * Represents UI options of a package.
 */
export interface UiConfig {
    /** References required by UI components. */
    references: Nullish<UiReferenceConfig[]>;
}

/**
 * Represents a property in a package.
 */
export interface PropertyConfig {
    /** Name of the property. Property names are unique within a package. */
    propertyName: string;

    /** Initial value of the property. */
    defaultValue?: unknown;

    /** True if a non-null value is required at runtime. */
    required?: Nullish<boolean>;
}

export interface ParseMetadataSuccess {
    type: "success";
    value: PackageMetadata;
}

export interface ParseMetadataError {
    type: "error";

    /** Note: new error codes might be introduced in the future. */
    code: ExtensibleUnion<"unsupported-version" | "validation-error">;
    message: string;
    cause?: unknown;
}

export type ParseMetadataResult = ParseMetadataSuccess | ParseMetadataError;

/**
 * The key under which the package metadata is added to the `package.json` of an npm package.
 */
export const PACKAGE_JSON_KEY = "openPioneerFramework";

/**
 * The latest supported metadata version (a semver).
 * Guaranteed to start with `"1."`.
 */
export const LATEST_VERSION: string = "1.1.0";

export type MinorVersion = string & { __brand: "package-format-minor-version" };

/**
 * Minor versions, e.g. `1.0`, `1.1`.
 * These versions do _not_ include the patch version (not needed: patch versions are compatible with each other).
 */
export const MINOR_VERSIONS: readonly MinorVersion[] = [
    "1.0" as MinorVersion,
    "1.1" as MinorVersion
];

// Target (minor version) to semver with patch version (if any).
const LATEST_VERSION_FOR_TARGET: Record<MinorVersion, string> = {
    ["1.0" as MinorVersion]: "1.0.1",
    ["1.1" as MinorVersion]: "1.1.0"
};

/* NOTE: do not use .strict() for objects here to allow future additions of optional properties */

const VERSION_FIELD = "packageFormatVersion";

const VERSION_SCHEMA = z.object({
    [VERSION_FIELD]: z.string()
});

const PROPERTY_CONFIG_SCHEMA: z.ZodType<PropertyConfig> = z.object({
    propertyName: z.string(),
    defaultValue: z.any().nullish().optional(),
    required: z.boolean().nullish().optional()
});

const REFERENCE_CONFIG_SCHEMA = z.object({
    type: z.enum(["all", "unique"] as const),
    referenceName: z.string(),
    interfaceName: z.string(),
    qualifier: z.string().nullish().optional()
}) satisfies z.ZodType<ReferenceConfig>;

const UI_CONFIG_SCHEMA: z.ZodType<UiConfig> = z.object({
    references: REFERENCE_CONFIG_SCHEMA.omit({ referenceName: true }).array()
});

const I18N_CONFIG_SCHEMA: z.ZodType<I18nConfig> = z.object({
    languages: z.string().array().optional()
});

const PROVIDES_CONFIG_SCHEMA: z.ZodType<ProvidesConfig> = z.object({
    interfaceName: z.string(),
    qualifier: z.string().nullish().optional()
});

const SERVICE_CONFIG_SCHEMA: z.ZodType<ServiceConfig> = z.object({
    serviceName: z.string(),
    provides: PROVIDES_CONFIG_SCHEMA.array().nullish().optional(),
    references: REFERENCE_CONFIG_SCHEMA.array().nullish().optional()
});

const RUNTIME_META_CONFIG_SCHEMA: z.ZodType<RuntimeMeta> = z.object({
    metadataVersion: z.string().nullish().optional()
});

const PACKAGE_METADATA_SCHEMA: z.ZodType<PackageMetadata> = VERSION_SCHEMA.extend({
    services: SERVICE_CONFIG_SCHEMA.array().nullish().optional(),
    servicesModule: z.string().nullish().optional(),
    styles: z.string().nullish().optional(),
    i18n: I18N_CONFIG_SCHEMA.nullish().optional(),
    ui: UI_CONFIG_SCHEMA.nullish().optional(),
    properties: PROPERTY_CONFIG_SCHEMA.array().nullish().optional(),
    runtimeMeta: RUNTIME_META_CONFIG_SCHEMA.nullish().optional()
});

const featuresSince: Record<"app-deployment-module", MinorVersion> = {
    "app-deployment-module": "1.1" as MinorVersion
};

/**
 * Checks whether the chosen package format compilation target supports the given feature.
 */
export function supportsFeature(
    target: MinorVersion,
    feature: "app-deployment-module"
): { supports: true } | { supports: false; needed: MinorVersion } {
    const featureTarget = featuresSince[feature];
    if (!featureTarget) {
        throw new Error(`Unknown feature: '${feature}'`);
    }

    const featureSemver = toSemver(featureTarget);
    const compileSemver = toSemver(target);
    if (compileSemver.compare(featureSemver) >= 0) {
        return {
            supports: true
        };
    } else {
        return {
            supports: false,
            needed: featureTarget
        };
    }
}

const MINOR_VERSION_RE = /^\d+\.\d+$/;

function toSemver(target: MinorVersion): SemVer {
    if (!target.match(MINOR_VERSION_RE)) {
        throw new Error(`Target '${target}' is not a valid target version.`);
    }
    return new SemVer(target + ".0");
}

/**
 * Attempts to parse the given `jsonValue` object into a validated metadata object.
 */
export function parsePackageMetadata(jsonValue: unknown): ParseMetadataResult {
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
        if (!canParse(LATEST_VERSION, serializedVersion)) {
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

    return {
        type: "success",
        value: metadataResult.data
    };
}

/**
 * Serializes the given metadata object into its raw json object representation.
 *
 * Note: the framework metadata version will be included automatically.
 *
 * NOTE: This will probably have to be multiple signatures in the future, when additional metadata fields are added.
 * At this time (version 1.1), only new _source code_ features have been added.
 */
export function serializePackageMetadata(
    metadata: OutputPackageMetadata,
    target: MinorVersion
): unknown {
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    if ((metadata as any)[VERSION_FIELD]) {
        throw new Error(`The package metadata version should not be specified directly.`);
    }

    const latestVersion = LATEST_VERSION_FOR_TARGET[target];
    if (!latestVersion) {
        throw new Error(`Unknown target version: '${target}'.`);
    }

    const augmentedMetadata: PackageMetadata = {
        ...metadata,
        [VERSION_FIELD]: latestVersion
    };

    // Sanity check: pass our own validation.
    const finalMetadata = JSON.parse(JSON.stringify(augmentedMetadata));
    try {
        PACKAGE_METADATA_SCHEMA.parse(augmentedMetadata);
    } catch (e) {
        throw new Error(`Failed to validate framework metadata before writing`, { cause: e });
    }
    return finalMetadata;
}
