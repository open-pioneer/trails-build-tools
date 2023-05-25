// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0

import { canSupportAsReader } from "./compatibility";

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

export type Nullable<T> = T | null | undefined;

export const CURRENT_VERSION = "1.0.0";

/**
 * Package metadata in version 1.
 */
export interface PackageMetadata {
    /** Semantic version, 1.x.y */
    version: string;

    /** Services in the package */
    services: ServiceConfig[];

    /** Services module to import. Required if there are any services. */
    servicesModule?: Nullable<string>;

    /** Styles to import, if the package comes with builtin CSS rules styles. */
    styles?: Nullable<string>;

    /** Languages and their messages defined by the package. */
    i18n: I18nConfig;

    /** References etc. required by UI components. */
    ui: UiConfig;

    /** Properties defined by the package. */
    properties: PropertyConfig[];
}

export interface ServiceConfig {
    /** Name of the service. */
    name: string;

    /** Interfaces provided by the service. */
    provides: ProvidesConfig[];

    /** References required by the service. */
    references: ReferenceConfig[];
}

export interface ProvidesConfig {
    /** Provided interface name. */
    interfaceName: string;

    /** Interface qualifier (optional). */
    qualifier?: Nullable<string>;
}

export interface ReferenceConfig {
    /** Requires all implementations of this interface or a unique implementation. */
    type: "all" | "unique";

    /** Name of the reference (injected as). */
    referenceName: string;

    /** Required interface name. */
    interfaceName: string;

    /** Interface qualifier (optional). */
    qualifier?: Nullable<string>;
}

export interface I18nConfig {
    /** Supported languages. */
    languages: string[];
}

export interface UiConfig {
    /** References required by UI components. */
    references: Omit<ReferenceConfig, "referenceName">[];
}

export interface PropertyConfig {
    /** Name of the property. */
    name: string;

    /** Initial value of the property. */
    value: unknown;

    /** True if a non-null value is required at runtime. */
    required?: Nullable<boolean>;
}

/**
 * Returns true if the current version of the parser can read the given serialized version.
 */
export function supportsAsReader(serializedVersion: string): boolean {
    return canSupportAsReader(CURRENT_VERSION, serializedVersion);
}
