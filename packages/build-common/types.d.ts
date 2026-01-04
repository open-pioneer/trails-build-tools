// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
export { BuildConfig } from "@open-pioneer/build-support";
import { BuildConfig } from "@open-pioneer/build-support";

export namespace RuntimeSupport {
    /** Package name of the Open Pioneer Trails runtime library. */
    export const RUNTIME_PACKAGE_NAME: string;

    /** The (unresolved) react-integration module id.  */
    export const REACT_INTEGRATION_MODULE_ID: string;

    /** The (unresolved) metadata module id. */
    export const METADATA_MODULE_ID: string;

    /**
     * Checks if the given module id is a virtual module.
     * Returns the type of the virtual module or undefined if the module id does not match anything.
     *
     * Throws an error if the module id uses the virtual prefix without a match, as that might be a mistake by the user. */
    export function parseVirtualModule(moduleId: string): "app" | "react-hooks" | undefined;

    /** Returns the module content to implement the `open-pioneer:react-hooks` module. */
    export function generateReactHooks(
        packageName: string,
        reactIntegrationModuleId?: string
    ): string;
}

/**
 * Types and helper functions to work with version 1 of the Open Pioneer Trails package metadata.
 */
export namespace PackageMetadataV1 {
    export type Nullish<T> = T | null | undefined;

    /**
     * Helper type to express a set of statically known values (with autocompletion) that can still be extended.
     *
     * See this issue for more details: https://github.com/microsoft/TypeScript/issues/29729
     */
    export type ExtensibleUnion<Values extends string> = Values | (string & {});

    /**
     * The currently supported metadata version (a semver).
     * Guaranteed to start with `"1."`.
     */
    export const CURRENT_VERSION: string;

    /**
     * The key under which the package metadata is added to the `package.json` of an npm package.
     */
    export const PACKAGE_JSON_KEY: "openPioneerFramework";

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
        value?: unknown;

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
     * Attempts to parse the given `jsonValue` object into a validated metadata object.
     */
    export function parsePackageMetadata(jsonValue: unknown): ParseMetadataResult;

    /**
     * Serializes the given metadata object into its raw json object representation.
     *
     * Note: the framework metadata version will be included automatically.
     */
    export function serializePackageMetadata(metadata: OutputPackageMetadata): unknown;
}

/** Internal representation of a package. */
export interface PackageConfig {
    /** Services, if any, indexed by name. */
    services: Map<string, Service>;

    /** Entry point for services. */
    servicesModule: string | undefined;

    /** Css entry point, if any. */
    styles: string | undefined;

    /** Supported languages. */
    languages: Set<string>;

    /** UI config */
    uiReferences: UiReference[];

    /** Package properties. */
    properties: Map<string, Property>;

    /**
     * Overrides for other packages, indexed by package name.
     * This is undefined if the package does not use the 'overrides' property.
     */
    overrides: Map<string, PackageOverrides> | undefined;

    runtimeVersion: RuntimeVersion;
}

/** Internal representation of a service. */
export interface Service {
    /** Service name (unique). */
    serviceName: string;

    /** Provided interfaces, if any. */
    provides: ProvidedInterface[];

    /** References to other services, indexed by name. */
    references: Map<string, Reference>;
}

/** Represents an interface provided by a service. */
export interface ProvidedInterface {
    /** Interface name. */
    interfaceName: string;

    /** Additional qualifier. */
    qualifier: string | undefined;
}

/** Represents a reference required by a service. */
export interface Reference {
    /** Type of reference (single unique match, or 'get all implementations'). */
    type: "unique" | "all";

    /** Reference name (unique). */
    referenceName: string;

    /** Referenced interface name. */
    interfaceName: string;

    /** Additional qualifier. */
    qualifier: string | undefined;
}

/** Represents a reference required by the UI. */
export type UiReference = Omit<Reference, "referenceName">;

/** Internal representation of a property. */
export interface Property {
    /** Property name (unique). */
    propertyName: string;

    /** Initial property value (may be undefined). */
    defaultValue: unknown;

    /** True: must be set to a non-null value at runtime. */
    required: boolean;
}

/** Holds overrides for things in a packages. Only allowed in apps. */
export interface PackageOverrides {
    /** Name of the package. */
    packageName: string;

    /** Overrides for services, indexed by service name. */
    services: Map<string, ServiceOverrides>;
}

/** Overrides for a single service. */
export interface ServiceOverrides {
    /** Name of the service. */
    serviceName: string;

    /** Enable or disable a service from another package. */
    enabled?: boolean | undefined;
}

/**
 * Extracts the package configuration from the parsed build config file.
 */
export function createPackageConfigFromBuildConfig(buildConfig: BuildConfig): PackageConfig;

/**
 * Extracts the package configuration from the given package metadata object.
 */
export function createPackageConfigFromPackageMetadata(
    metadata: PackageMetadataV1.PackageMetadata
): PackageConfig;

/**
 * The name of the build config file expected in an Open Pioneer Trails page.
 *
 * This is currently always `build.config.mjs`.
 */
export const BUILD_CONFIG_NAME: string;

/**
 * Ensures that `value` conforms to the {@link BuildConfig} interface.
 * Throws an error if that is not the case.
 *
 * @returns `value` but casted to the appropriate type.
 */
export function verifyBuildConfig(value: unknown): BuildConfig;

/**
 * Loads the configuration object exported by the given configuration file.
 *
 * Throws an error if the there is a problem loading the file or if the file does
 * not export a valid build configuration object.
 */
export function loadBuildConfig(path: string): Promise<BuildConfig>;

export type RuntimeVersion = "1.0.0" | "2.0.0";
export const RUNTIME_BASE_VERSION: RuntimeVersion;
export function isRuntimeVersion(value: unknown): value is RuntimeVersion;
