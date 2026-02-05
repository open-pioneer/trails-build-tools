// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { RuntimeVersion } from "@open-pioneer/build-common";

export interface BuildConfig {
    /**
     * Lists entry points exposed by this package.
     *
     * Entry points are JavaScript / TypeScript modules that can be
     * imported by consumers of the published package.
     * Other modules will not be importable by consumers to enforce
     * encapsulation and to allow for future optimizations.
     *
     * This option is required when building a package for publishing
     * and is optional otherwise.
     *
     * @example
     *
     * ```js
     * // Extensions are optional
     * entryPoints: [
     *   "./index"
     * ]
     * ```
     *
     * NOTE: There is no need to list the {@link servicesModule} in here.
     */
    entryPoints?: string | string[];

    /**
     * Path to a file containing CSS or SCSS.
     * The file will be automatically loaded when the package
     * is part of an application.
     *
     * @example
     *
     * ```js
     * styles: "./styles.css"
     * ```
     *
     * ```js
     * styles: "./some-path.scss"
     * ```
     */
    styles?: string;

    /**
     * Array of supported languages, every entry here needs a ./i18n/<lang>.yaml file.
     *
     * @example
     *
     * ```js
     *i18n: ["de", "en"]
     * ```
     */
    i18n?: string[];

    /**
     * Services provided by this package.
     *
     * The service name must match an exported class from the package's services module (usually `services.{js,ts}`).
     *
     * @example
     *
     * ```js
     * services: {
     *    MyService: {
     *        provides: "some.interface.name",
     *        references: {
     *            // ...
     *        }
     *    }
     * }
     * ```
     */
    services?: Record<string, ServiceConfig>;

    /**
     * The module that exports service classes.
     *
     * For every service defined in `services`, this module must export a service implementation class
     * with the same name.
     *
     * @example
     *
     * Import services from a different file:
     *
     * ```js
     * {
     *      // ...
     *      servicesModule: "./myServices"
     * }
     * ```
     *
     * @default "./services"
     */
    servicesModule?: string;

    /**
     * UI configuration.
     *
     * @example
     *
     * ```js
     * ui: {
     *     references: ["integration.ExternalEventService"]
     * }
     * ```
     */
    ui?: UiConfig;

    /**
     * Default values for properties that are supported by this package.
     * Properties may be overwritten by the application.
     *
     * Only plain old JSON data is allowed for values.
     */
    properties?: Record<string, unknown>;

    /**
     * Metadata about properties defined by this package.
     * Names in this record should match the property name in {@link properties}.
     */
    propertiesMeta?: Record<string, PropertyMetaConfig>;

    /**
     * Apply overrides to the default configuration of another package.
     *
     * Only has an effect when used from the `build.config.mjs` of an application package.
     *
     * Key: package name (e.g. `@open-pioneer/runtime`). Value: Overrides for that package.
     */
    overrides?: Record<string, PackageOverridesConfig>;

    /**
     * Contains options interpreted when building a package for publishing.
     */
    publishConfig?: PublishConfig;

    appRuntimeMetadataversion?: RuntimeVersion;
}

/**
 * Describes a single service.
 */
export interface ServiceConfig {
    /**
     * Declarations of interfaces provided by this service.
     *
     * The interface name can be specified directly (as a string) for convenience.
     */
    provides?: string | (string | ProvidesConfig)[];

    /**
     * Declares references to other services.
     * References will be injected into the service's constructor.
     *
     * The interface name can be specified directly (as a string) for convenience.
     */
    references?: Record<string, string | ReferenceConfig>;
}

/**
 * Describes a package's UI.
 */
export interface UiConfig {
    /**
     * Interfaces names of the services referenced by the UI.
     * The UI can only use services that are declared as dependencies in this array.
     */
    references?: (string | ReferenceConfig)[];
}

/**
 * Describes an interface provided by a service.
 */
export interface ProvidesConfig {
    /** Name of the interface that is provided by this service. */
    name: string;

    /**
     * An additional qualifier to disambiguate multiple implementations of the same interface.
     * This property should be set to a unique value if the interface is designed to support multiple implementations.
     */
    qualifier?: string;
}

/**
 * Describes a reference to an interface required by a service.
 */
export interface ReferenceConfig {
    /** Name of the interface that is referenced by this service. */
    name: string;

    /**
     * An additional qualifier to disambiguate an interface reference when there are multiple implementations.
     */
    qualifier?: string;

    /**
     * Set this to true to inject *all* implementations of the specified interface instead of a specific one.
     * When used from a service, this will inject the implementations as an array.
     *
     * Note that this option is mutually exclusive with {@link qualifier}.
     */
    all?: boolean;
}

/**
 * Describes additional configuration for a package property.
 */
export interface PropertyMetaConfig {
    /**
     * Required properties *must* be specified by an application
     * to a valid (non null or undefined) value.
     */
    required?: boolean;
}

/**
 * Contains options interpreted when building a package for publishing with the `@open-pioneer/build-package` tool.
 */
export interface PublishConfig {
    /**
     * An array of file patterns matching asset files.
     *
     * Assets will be included with the package when it is being built for publishing.
     * _Asset files not listed here will not be available to external consumers._
     *
     * By default, all files in `assets/**` will be included.
     *
     * For the syntax supported in patterns, see [micromatch](https://github.com/micromatch/micromatch#matching-features).
     *
     * > NOTE: File names starting with `.` are always ignored for security reasons.
     *
     * > NOTE: Directories cannot match by themselves, you must configure a pattern that matches the individual files
     * > (e.g. `assets/**` instead of `assets/`).
     *
     * @example
     *
     * ```js
     * {
     *   assets: [
     *     "assets/**",
     *     "fonts/*.woff2"
     *   ]
     * }
     * ```
     */
    assets?: string | string[];

    /**
     * Enables or disables generation of TypeScript declaration files (`.d.ts`).
     *
     * Generation of declaration files requires a (minimal) `tsconfig.json` in the package's directory.
     *
     * Defaults to `true` if a TypeScript file is present in the package, `false` otherwise.
     */
    types?: boolean;

    /**
     * Enables or disables generation of [source maps](https://web.dev/source-maps/).
     *
     * Note that generated source maps will contain the entire, unprocessed source code
     * if the source files.
     *
     * Defaults to `true`.
     */
    sourceMaps?: boolean;

    /**
     * Enables or disables strict checks.
     *
     * When strict checks are enabled, certain errors (such as a missing license file)
     * become fatal and abort the build.
     *
     * This can be set to `false` during development to update a package bit by bit,
     * but it should otherwise be `true` to detect common errors.
     *
     * Defaults to `true`.
     */
    strict?: boolean;

    /**
     * Optional validation options.
     *
     * Validation problems result in warnings (or errors, if {@link strict}) during the build.
     */
    validation?: ValidationOptions;
}

/**
 * Validation options accepted during package compilation.
 */
export interface ValidationOptions {
    /**
     * Whether a LICENSE file is required.
     *
     * Defaults to `true`.
     */
    requireLicense?: boolean;

    /**
     * Whether a README file is required.
     *
     * Defaults to `true`.
     */
    requireReadme?: boolean;

    /**
     * Whether a CHANGELOG file is required.
     *
     * Defaults to `true`.
     */
    requireChangelog?: boolean;
}

/**
 * Overrides for a certain package.
 */
export interface PackageOverridesConfig {
    /**
     * Overrides for a given service.
     * The key to this object is the name of that service within its package.
     */
    services?: Record<string, ServiceOverridesConfig>;
}

/**
 * Overrides for a single service.
 */
export interface ServiceOverridesConfig {
    /**
     * Set this value to `false` to disable the given service implementation entirely.
     *
     * When a service is disabled, it will not be loaded when the app starts.
     * This will often require the app to also provide an alternative implementation of that
     * service since other services may depend on it.
     *
     * > NOTE: Keep in mind that this is an expert feature designed to 'fix' (or replace) a service
     * > when other, simpler strategies (configuration options, well defined interfaces, etc.) cannot help anymore.
     * > This feature should not be overused.
     *
     * @default true
     */
    enabled?: boolean;
}

/**
 * Accepts `config` as a {@link BuildConfig} object.
 * This is a helper function to provide type hints.
 *
 * @returns config
 */
export declare function defineBuildConfig(config: BuildConfig): BuildConfig;
