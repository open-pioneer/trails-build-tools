// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { PackageConfig, RuntimeVersion } from "@open-pioneer/build-common";
import { PluginContext } from "rollup";

/**
 * Contains build-time information about an app.
 */
export interface AppMetadata {
    /** App name. */
    name: string;

    /** Directory on disk. */
    directory: string;

    /** Path to package.json file. */
    packageJsonPath: string;

    /** Locales required by the application. */
    locales: string[];

    /**
     * The application package itself.
     */
    appPackage: PackageMetadata;

    /**
     * Packages used by the app.
     * Includes the app package itself!
     */
    packages: PackageMetadata[];

    /** runtime version of the vite-plugin. */
    appRuntimeMetadataversion: RuntimeVersion;
}

/**
 * Contains build-time information about a package.
 */
export interface PackageMetadata {
    /** */
    type: "pioneer-package";

    /** Package name. */
    name: string;

    /** Package version. */
    version: string | undefined;

    /** Directory on disk. */
    directory: string;

    /** Path to package.json file. */
    packageJsonPath: string;

    /** Path to entry point (contains service exports). */
    servicesModulePath: string | undefined;

    /** Path to the resolved css file (if any). */
    cssFilePath: string | undefined;

    /**
     * Paths to i18n yaml config for any defined lang in build config.
     * Key: locale, value: file path
     *
     * NOTE: These have not (yet) been checked, they might not exist.
     */
    i18nPaths: Map<string, string>;

    /**
     * Locale ids. These are valid keys for `i18nPaths`.
     */
    readonly locales: string[];

    /** Runtime dependencies (from package.json). */
    dependencies: PackageDependency[];

    /** Parsed metadata (from build config file). */
    config: PackageConfig;
}

/**
 * Represents a dependency of a package.
 */
export interface PackageDependency {
    packageName: string;
    optional: boolean;
}

/**
 * Package that was discovered during dependency analysis which does not have open-pioneer metadata.
 * We cache such objects to remember the result of the analysis.
 */
export interface PlainPackageMetadata {
    type: "plain";

    /** Package name. */
    name: string;

    /** Package version. */
    version: string | undefined;

    /** Directory on disk. */
    directory: string;
}

/**
 * Either an Open Pioneer Trails package or a plain package.
 */
export type InternalPackageMetadata = PackageMetadata | PlainPackageMetadata;

export type MetadataContext = Pick<PluginContext, "addWatchFile" | "resolve" | "warn">;

export interface ResolvedPackageLocation {
    type: "absolute";
    directory: string;
}

export interface UnresolvedDependency {
    type: "unresolved";
    dependency: PackageDependency;
    importedFrom: string;
}

export type PackageLocation = ResolvedPackageLocation | UnresolvedDependency;
