// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { PackageConfig, RuntimeSupport } from "@open-pioneer/build-common";

/**
 * Contains build-time information about an app.
 */
export interface AnalyzedApp {
    /** App name. */
    name: string;

    /** Directory on disk. */
    directory: string;

    /** Path to package.json file. */
    packageJsonPath: string;

    /** Message locales required by the application. */
    locales: string[];

    /**
     * The application package itself.
     */
    appPackage: AnalyzedPackage;

    /**
     * Packages used by the app.
     * Includes the app package itself!
     */
    packages: AnalyzedPackage[];

    /**
     * Runtime metadata version the vite plugin generates for the runtime package.
     **/
    runtimeMetadataVersion: RuntimeSupport.RuntimeMetadataVersion;
}

/**
 * Contains build-time information about a Trails package.
 */
export interface AnalyzedPackage {
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

    /** The UNRESOLVED services module id (e.g. `@foo/packageName/services`). */
    servicesModuleId: string | undefined;

    /** Path to entry point (contains service exports). */
    servicesModulePath: string | undefined;

    /** Path to the resolved css file (if any). */
    cssFilePath: string | undefined;

    /**
     * Paths to the i18n yaml files, one per message locale declared in the build config.
     * Key: message locale, value: file path
     *
     * NOTE: These have not (yet) been checked, they might not exist.
     */
    i18nPaths: Map<string, string>;

    /**
     * Message locales. These are valid keys for `i18nPaths`.
     */
    readonly locales: string[];

    /** Runtime dependencies (from package.json). */
    dependencies: PackageDependency[];

    /** Package config, read from the build config or the package metadata. */
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
 * Package that was discovered during dependency analysis which has neither a build config nor package metadata.
 * We cache such objects to remember the result of the analysis.
 */
export interface PlainPackage {
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
export type DiscoveredPackage = AnalyzedPackage | PlainPackage;

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
