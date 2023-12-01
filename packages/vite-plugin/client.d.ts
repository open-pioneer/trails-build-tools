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
    import { type PackageIntl, type InterfaceNameForServiceType } from "@open-pioneer/runtime";
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
     * const service = useService<MyInterface>("my-package.MyInterface");
     * ```
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
     * Example:
     *
     * ```ts
     * const services = useServices<MyInterface>("my-package.MyInterface");
     * ```
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
