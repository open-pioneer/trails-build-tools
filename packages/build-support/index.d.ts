// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
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
    entryPoints?: string[];

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
     * An array of file patterns matching asset files.
     *
     * Assets will be included with the package when it is being built for publishing.
     * _Asset files not listed here will not be available to external consumers._
     *
     * By default, all files in `assets/**` will be included.
     *
     * For the syntax supported in patterns, see [micromatch](https://github.com/micromatch/micromatch#matching-features)
     *
     * > NOTE: File names with leading `.` in their name are always ignored for security reasons.
     *
     * @example
     *
     * ```js
     * {
     *   assets: [
     *     "assets/**",
     *     "fonts/**"
     *   ]
     * }
     * ```
     */
    assets?: string[];

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
 * Accepts `config` as a {@link BuildConfig} object.
 * This is a helper function to provide type hints.
 *
 * @returns config
 */
export declare function defineBuildConfig(config: BuildConfig): BuildConfig;
