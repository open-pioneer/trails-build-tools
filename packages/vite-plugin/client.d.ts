// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

declare module "open-pioneer:app" {
    import { type ApplicationMetadata } from "@open-pioneer/runtime/metadata";

    const metadata: Required<ApplicationMetadata>;
    export = metadata;
}

/**
 * Provides source information for a module.
 */
declare module "open-pioneer:source-info" {
    /**
     * The unique source id of the module.
     *
     * @example
     * // current file is 'Component.ts' in package 'my-package'
     * import { sourceId } from "open-pioneer:source-info";
     * // prints 'my-package/Component'
     * console.log(`${sourceId}`);
     *
     * @example
     * // Create a logger using the source id.
     * import { createLogger } from '@open-pioneer/core';
     * import { sourceId } from "open-pioneer:source-info";
     * const LOG = createLogger(sourceId);
     */
    export const sourceId: string;
}

/**
 * Provides react hooks to a module.
 * The module must be inside a valid Open Pioneer Trails package (or app).
 *
 * The generated hooks will ensure that hooks return data structures and services
 * for the correct package, and that dependency declarations are valid.
 */
declare module "open-pioneer:react-hooks" {
    import {
        type PackageIntl,
        type DeclaredService,
        type InterfaceNameForServiceType
    } from "@open-pioneer/runtime";
    import type { UseServiceOptions } from "@open-pioneer/runtime/react-integration";
    export { type UseServiceOptions };

    /**
     * Returns an implementation of the given interface.
     *
     * A complete interface name is required (e.g. "logging.LogService").
     *
     * In order to use a service, it must be declared as an UI-dependency in the package's configuration file.
     *
     * Example:
     *
     * ```ts
     * // Usage with explicit type. Requires `MyInterface` to provide TypeScript integration via `DeclaredService<...>`.
     * const service = useService<MyInterface>("my-package.MyInterface");
     * ```
     *
     * Example:
     *
     * ```ts
     * // Usage from JavaScript or from TypeScript without an explicit type.
     * // The hook will simply return `unknown`.
     * const service = useService("my-package.MyInterface");
     * ```
     *
     * Example:
     *
     * ```ts
     * // Explicit `unknown` combined with an unsafe cast. Can be used if the service
     * // does not provide proper TypeScript integration.
     * const service = useService<unknown>("my-package.MyInterface") as MyCustomType;
     * ```
     * @see {@link DeclaredService}
     */
    export function useService<ServiceType = unknown>(
        interfaceName: InterfaceNameForServiceType<ServiceType>,
        options?: UseServiceOptions
    ): ServiceType;

    /**
     * Returns all implementations of the given interface.
     *
     * A complete interface name is required (e.g. "logging.LogService").
     *
     * In order to use all services, it must be declared as an UI-dependency (`all: true`) in the package's configuration file.
     *
     * @see {@link useService}
     */
    export function useServices<ServiceType = unknown>(
        interfaceName: InterfaceNameForServiceType<ServiceType>,
        options?: UseServiceOptions
    ): ServiceType[];

    /**
     * Returns the properties of the calling component's package.
     */
    export function useProperties(): Readonly<Record<string, unknown>>;

    /**
     * Returns the i18n object for the calling component's package.
     */
    export function useIntl(): PackageIntl;
}

/**
 * Provides metadata about the current deployment.
 */
declare module "open-pioneer:deployment" {
    /**
     * Returns the base URL of the deployed application.
     *
     * This returns an absolute URL to the root of the deployed application, for example:
     *
     * - http://localhost:5173/ or http://localhost:5173/optional/path/ (during development)
     * - https://example.com/path/to/root/ (during production)
     *
     * You can use this string to compute the addresses of resources that are deployed together with your app.
     */
    export const baseUrl: string;
}

/**
 * Provides access to the current package's public asset files.
 *
 * Public assets are declared in the package's `build.config.mjs`.
 * The build system ensures that public assets are copied over when building the application.
 *
 * This module computes the URLs to those assets at runtime, so they can be `fetch()`-ed or downloaded.
 */
declare module "open-pioneer:assets" {
    /**
     * The URL of the root directory of this package's public assets.
     *
     * The URL always ends with a `/`.
     * For example, in an app deployed at `https://example.com/`, the value might be
     * `https://example.com/packages/<packageName>/`.
     *
     * The specific location in the final build output is an implementation detail.
     * Always use this constant or {@link getPublicAssetUrl} to resolve public assets.
     */
    export const publicAssetsUrl: string;

    /**
     * Returns the fully resolved URL to the specified public asset file.
     *
     * For example:
     *
     * ```ts
     * // in my-package/my-file.ts
     * import { getPublicAssetUrl } from "open-pioneer:assets";
     *
     * // Public asset path local to this package. Should match the public asset declarations in `build.config.mjs`.
     * const localPath = "icons/my-icon.png";
     *
     * // The fully resolved absolute URL to the asset. Can be used at development time and in production.
     * const fileUrl = getPublicAssetUrl(localPath);
     * console.log(fileUrl); // E.g. https://example.com/packages/my-package/icons/my-icon.png
     * ```
     *
     * The specific location in the final build output is an implementation detail.
     * Always use this function or {@link publicAssetsUrl} to resolve public assets.
     */
    export function getPublicAssetUrl(localAssetPath: string): string;
}

/**
 * Provides test support helpers for the importing package, such as the actual i18n messages that would be used when running in a trails app.
 *
 * This module is designed to be used in combination with the `@open-pioneer/test-utils` package.
 * It can only be imported in tests.
 *
 * @example
 * // Render a component with the real messages of its package.
 * import { PackageContextProvider } from "@open-pioneer/test-utils/react";
 * import { messages, messageLocale } from "open-pioneer:test-support";
 * import { render } from "@testing-library/react"; // or import { render } from "vitest-browser-react";
 *
 * render(
 *     <PackageContextProvider messages={messages} locale={messageLocale}>
 *         <MyComponent />
 *     </PackageContextProvider>
 * );
 *
 * @example
 * // Request a different locale.
 * // The locale must be listed in the `i18n` array of the package's `build.config.mjs`.
 * import { messages, messageLocale } from "open-pioneer:test-support?locale=de";
 */
declare module "open-pioneer:test-support" {
    /**
     * I18n messages keyed by package name and message id.
     *
     * The record fits the `messages` property of `PackageContextProvider` from `@open-pioneer/test-utils/react`.
     * It is empty when the package does not declare any locales in its `build.config.mjs`.
     */
    export const messages: Record<string, Record<string, string>>;

    /**
     * The locale of {@link messages}.
     * It is an empty string when the package does not declare any locales.
     */
    export const messageLocale: string;
}

/**
 * Variant of `open-pioneer:test-support` with an explicit parameters, for example `open-pioneer:test-support?locale=de`.
 *
 * See the declaration of `open-pioneer:test-support` for details.
 */
declare module "open-pioneer:test-support?*" {
    /**
     * I18n messages keyed by package name and message id, in the requested locale.
     */
    export const messages: Record<string, Record<string, string>>;

    /**
     * The requested locale.
     */
    export const messageLocale: string;
}
