// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
declare module "open-pioneer:app" {
    import { type ApplicationMetadata } from "@open-pioneer/runtime/metadata";

    const metadata: Required<ApplicationMetadata>;
    export = metadata;
}

/**
 * Provides react hooks to a module.
 * The module must be inside a valid pioneer package (or app).
 *
 * The generated hooks will ensure that hooks return data structures and services
 * for the correct package, and that dependency declarations are valid.
 */
declare module "open-pioneer:react-hooks" {
    // eslint-disable-next-line unused-imports/no-unused-imports
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
