// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { readFile, realpath } from "fs/promises";
import { dirname, join } from "path";
import { PluginContext, RollupWarning } from "rollup";
import { normalizePath } from "vite";
import { ReportableError } from "../ReportableError";
import { createDebugger } from "../utils/debug";
import { fileExists, isInDirectory } from "../utils/fileUtils";
import { Cache } from "../utils/Cache";
import {
    BUILD_CONFIG_NAME,
    isBuildConfig,
    loadBuildConfig,
    NormalizedPackageConfig
} from "./parseBuildConfig";
import { I18nFile, loadI18nFile } from "./parseI18nYaml";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:metadata");

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
     * Packages used by the app.
     * Includes the app package itself!
     */
    packages: PackageMetadata[];
}

/**
 * Contains build-time information about a package.
 */
export interface PackageMetadata {
    /** Package name. */
    name: string;

    /** Directory on disk. */
    directory: string;

    /** Path to package.json file. */
    packageJsonPath: string;

    /** Path to entry point (contains service exports). */
    entryPointPath: string | undefined;

    /** Path to the resolved css file (if any). */
    cssFilePath: string | undefined;

    /**
     * Paths to i18n yaml config for any defined lang in build config.
     * Key: locale, value: file path
     */
    i18nPaths: Map<string, string>;

    /** Runtime dependencies (from package.json). */
    dependencies: string[];

    /** Parsed metadata (from build config file). */
    config: NormalizedPackageConfig;
}

export type MetadataContext = Pick<PluginContext, "addWatchFile" | "resolve" | "warn">;

export interface ResolvedPackageLocation {
    type: "absolute";
    directory: string;
}

export interface UnresolvedPackageLocation {
    type: "unresolved";
    packageName: string;
    importedFrom: string;
}

export type PackageLocation = ResolvedPackageLocation | UnresolvedPackageLocation;

/**
 * Tracks metadata and the files that were used to parse that metadata.
 * watchFiles should be propagated when a caller receives a cached result,
 * otherwise hot reloading may not be triggered correctly on file changes.
 */
interface MetadataEntry {
    metadata: PackageMetadata;
    watchFiles: ReadonlySet<string>;
    warnings: RollupWarning[];
}

interface I18nEntry {
    i18n: I18nFile;
    watchFiles: ReadonlySet<string>;
}

/**
 * Provides metadata about apps and packages.
 * Metadata is read from disk on demand and will then be cached
 * until one of the file dependencies has changed.
 */
export class MetadataRepository {
    private sourceRoot: string;

    // Key: package directory on disk, value: existing metadata
    private packageMetadataCache: Cache<string, MetadataEntry, [ctx: MetadataContext]>;

    // Cache for the contents of i18n files.
    // Key: path on disk.
    private i18nCache: Cache<string, I18nEntry, [ctx: MetadataContext]>;

    /**
     * @param sourceRoot Source folder on disk, needed to detect 'local' packages
     */
    constructor(sourceRoot: string) {
        this.sourceRoot = sourceRoot;
        this.packageMetadataCache = this.createPackageMetadataCache();
        this.i18nCache = this.createI18nCache();
    }

    reset() {
        this.packageMetadataCache = this.createPackageMetadataCache();
        this.i18nCache = this.createI18nCache();
    }

    /**
     * Called by the plugin when a file has been changed.
     * The cached data associated with that file (if any) will be removed.
     */
    onFileChanged(path: string) {
        if (isPackageJson(path) || isBuildConfig(path)) {
            this.packageMetadataCache.invalidate(dirname(path));
        }
        this.i18nCache.invalidate(path);
    }

    /**
     * Returns the combined application metadata of the app in `appDirectory`.
     * Starting from the app's package.json, dependencies will be visited recursively.
     *
     * For packages that use our package extensions (services etc.), metadata will be gathered and
     * will be returned here.
     */
    async getAppMetadata(ctx: MetadataContext, appDirectory: string): Promise<AppMetadata> {
        isDebug && debug(`Request for app metadata of ${appDirectory}`);

        const appPackageMetadata = await this.getPackageMetadata(ctx, {
            type: "absolute",
            directory: appDirectory
        });
        if (!appPackageMetadata) {
            throw new ReportableError(
                `Failed to parse app metadata in ${appDirectory}. Ensure that the app is a valid local package.`
            );
        }

        // App's locales define which locales must be supported.
        const appLocales = Array.from(appPackageMetadata.i18nPaths.keys());

        // Map to ensure that we don't return duplicates. Key: package name
        const packageMetadataByName = new Map<string, PackageMetadata>();
        packageMetadataByName.set(appPackageMetadata.name, appPackageMetadata);

        // Recursively visit all dependencies.
        // Detected metadata is placed into `packageMetadata`.
        const visitDependencies = async (dependencies: string[], importedFrom: string) => {
            const jobs = dependencies.map(async (packageName) => {
                const packageMetadata = await this.getPackageMetadata(ctx, {
                    type: "unresolved",
                    packageName,
                    importedFrom
                });
                if (packageMetadata) {
                    if (!packageMetadataByName.has(packageMetadata.name)) {
                        packageMetadataByName.set(packageMetadata.name, packageMetadata);
                    }
                    await visitDependencies(
                        packageMetadata.dependencies,
                        packageMetadata.packageJsonPath
                    );
                }
            });
            return await Promise.all(jobs);
        };
        await visitDependencies(
            appPackageMetadata.dependencies,
            appPackageMetadata.packageJsonPath
        );

        const appMetadata: AppMetadata = {
            name: appPackageMetadata.name,
            directory: appPackageMetadata.directory,
            locales: appLocales,
            packageJsonPath: appPackageMetadata.packageJsonPath,
            packages: Array.from(packageMetadataByName.values())
        };
        return appMetadata;
    }

    /**
     * Returns package metadata associated with the given package.
     */
    async getPackageMetadata(
        ctx: MetadataContext,
        loc: PackageLocation
    ): Promise<PackageMetadata | undefined> {
        isDebug && debug(`Request for package metadata of ${formatPackageLocation(loc)}`);

        const packageDir = await this.resolvePackageLocation(ctx, loc);

        // This would have to be changed when packages from the 'outside' are also supported in the future.
        if (!isLocalPackage(packageDir, this.sourceRoot)) {
            isDebug && debug(`Skipping non-local package '${packageDir}'.`);
            return undefined;
        }

        const entry = await this.packageMetadataCache.get(packageDir, ctx);
        propagateWatchFiles(entry.watchFiles, ctx);
        for (const warning of entry.warnings) {
            ctx.warn(warning);
        }
        return entry.metadata;
    }

    /**
     * Returns the parsed contents of the given i18n file.
     */
    async getI18nFile(ctx: MetadataContext, path: string): Promise<I18nFile> {
        const { i18n, watchFiles } = await this.i18nCache.get(path, ctx);
        propagateWatchFiles(watchFiles, ctx);
        return i18n;
    }

    private async resolvePackageLocation(ctx: MetadataContext, loc: PackageLocation) {
        if (loc.type === "absolute") {
            return await realpath(loc.directory);
        }

        // Try to locate the package via rollup resolve.
        const unresolvedPackageJson = `${loc.packageName}/package.json`;
        const packageJsonLocation = await ctx.resolve(
            unresolvedPackageJson,
            normalizePath(loc.importedFrom),
            {
                skipSelf: true
            }
        );
        if (!packageJsonLocation || packageJsonLocation.external) {
            throw new ReportableError(
                `Request for '${unresolvedPackageJson}' did not result in a local file (required by '${loc.importedFrom}').`
            );
        }

        const packageDir = await realpath(dirname(packageJsonLocation.id));
        isDebug && debug(`Found package '${loc.packageName}' at ${packageDir}`);
        return packageDir;
    }

    private createI18nCache(): Cache<string, I18nEntry, [ctx: MetadataContext]> {
        return new Cache({
            getId(path) {
                return normalizePath(path);
            },
            async getValue(path, ctx) {
                isDebug && debug(`Loading i18n file ${path}`);

                // watch before loading. this protects against rare race conditions
                // caused by our manual watch workaround in the codegen plugin.
                // essentially, we must watch for changes BEFORE the files are loaded
                // to get reliable notifications.
                ctx.addWatchFile(path);
                const entry: I18nEntry = {
                    i18n: await loadI18nFile(path),
                    watchFiles: new Set([path])
                };
                return entry;
            },
            onInvalidate(path) {
                isDebug && debug(`Removed cache entry for i18n file ${path}`);
            },
            onCachedReturn(path) {
                isDebug && debug(`Returning cached entry for i18n file ${path}`);
            }
        });
    }

    private createPackageMetadataCache(): Cache<string, MetadataEntry, [ctx: MetadataContext]> {
        const provider = {
            _byName: new Map<string, PackageMetadata>(),

            getId(directory: string) {
                return normalizePath(directory);
            },
            async getValue(directory: string, ctx: MetadataContext): Promise<MetadataEntry> {
                isDebug && debug(`Loading metadata for package at ${directory}`);

                const watchFiles = new Set<string>();
                const warnings: RollupWarning[] = [];
                const trackingCtx: MetadataContext = {
                    resolve: ctx.resolve,
                    addWatchFile(id) {
                        ctx.addWatchFile(id);
                        watchFiles.add(id);
                    },
                    warn(msg: string | RollupWarning) {
                        warnings.push(typeof msg === "string" ? { message: msg } : msg);
                    }
                };
                const metadata = await parsePackageMetadata(trackingCtx, directory);
                isDebug && debug(`Metadata for '${metadata.name}': %O`, metadata);

                // Ensure only one version of a package exists in the app
                const existingMetadata = this._byName.get(metadata.name);
                if (
                    existingMetadata &&
                    normalizePath(existingMetadata.directory) !== normalizePath(metadata.directory)
                ) {
                    throw new ReportableError(
                        `Found package '${metadata.name}' at two different locations ${existingMetadata.directory} and ${metadata.directory}`
                    );
                }
                this._byName.set(metadata.name, metadata);

                return {
                    metadata,
                    watchFiles,
                    warnings
                };
            },
            onInvalidate(directory: string, entry: MetadataEntry) {
                isDebug && debug(`Removed cache entry for '${entry.metadata.name}'`);
                this._byName.delete(entry.metadata.name);
            },
            onCachedReturn(directory: string, entry: MetadataEntry) {
                isDebug && debug(`Returning cached metadata for '${entry.metadata.name}'`);
            }
        };
        return new Cache(provider);
    }
}

function propagateWatchFiles(watchFiles: Iterable<string>, ctx: MetadataContext) {
    for (const file of watchFiles) {
        ctx.addWatchFile(file);
    }
}

export async function parsePackageMetadata(
    ctx: MetadataContext,
    packageDir: string
): Promise<PackageMetadata> {
    isDebug && debug(`Visiting package directory ${packageDir}.`);

    const packageJsonPath = join(packageDir, "package.json");

    ctx.addWatchFile(packageJsonPath);
    const { name: packageName, dependencies } = await parsePackageJson(ctx, packageJsonPath);

    const buildConfigPath = join(packageDir, BUILD_CONFIG_NAME);
    let buildConfig: NormalizedPackageConfig | undefined;
    ctx.addWatchFile(normalizePath(buildConfigPath));
    if (await fileExists(buildConfigPath)) {
        try {
            buildConfig = await loadBuildConfig(buildConfigPath);
        } catch (e) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const msg = (e as any).message || "Unknown error";
            throw new ReportableError(`Failed to load build config ${buildConfigPath}: ${msg}`);
        }
    } else {
        throw new ReportableError(`Expected a ${BUILD_CONFIG_NAME} in ${packageDir}`);
    }

    let entryPoint: string | undefined;
    if (buildConfig.services.length) {
        try {
            entryPoint = (await ctx.resolve(packageDir))?.id;
        } catch (e) {
            ctx.warn(`Failed to resolve entry point for package ${packageDir}: ${e}`);
        }
    }

    let cssFile: string | undefined;
    if (buildConfig.styles) {
        try {
            cssFile = await resolveLocalFile(ctx, packageDir, buildConfig.styles);
        } catch (e) {
            throw new ReportableError(`Failed to resolve css file for package ${packageDir}: ${e}`);
        }
        if (!cssFile) {
            throw new ReportableError(
                `Failed to find css file '${buildConfig.styles}' in ${packageDir}`
            );
        }
    }

    const i18nPaths = new Map<string, string>();
    if (buildConfig.i18n) {
        for (const locale of buildConfig.i18n) {
            if (i18nPaths.has(locale)) {
                throw new ReportableError(
                    `Locale '${locale}' was defined twice in ${buildConfigPath}`
                );
            }

            const path = join(packageDir, "i18n", `${locale}.yaml`);
            ctx.addWatchFile(path);
            if (!(await fileExists(path))) {
                throw new ReportableError(`i18n file '${path}' does not exist.`);
            }

            i18nPaths.set(locale, normalizePath(path));
        }
    }

    return {
        name: packageName,
        directory: packageDir,
        packageJsonPath: packageJsonPath,
        entryPointPath: entryPoint,
        cssFilePath: cssFile,
        i18nPaths,
        dependencies,
        config: buildConfig
    };
}

async function parsePackageJson(ctx: MetadataContext, packageJsonPath: string) {
    if (!(await fileExists(packageJsonPath))) {
        throw new ReportableError(`Expected a 'package.json' file at ${packageJsonPath}`);
    }

    let packageJsonContent;
    try {
        packageJsonContent = JSON.parse(await readFile(packageJsonPath, "utf-8"));
    } catch (e) {
        throw new ReportableError(`Failed to read ${packageJsonPath}: ${e}`);
    }

    const packageName = packageJsonContent.name;
    if (typeof packageName !== "string") {
        throw new ReportableError(`Expected 'name' to be a string in ${packageJsonPath}`);
    }

    const dependencies = packageJsonContent.dependencies ?? {};
    if (typeof dependencies !== "object") {
        throw new ReportableError(`Expected a valid 'dependencies' object in ${packageJsonPath}`);
    }

    const dependencyNames = Object.keys(dependencies);
    return {
        name: packageName,
        dependencies: dependencyNames
    };
}

async function resolveLocalFile(ctx: MetadataContext, packageDir: string, localModuleId: string) {
    const result = await ctx.resolve(`./${localModuleId}`, `${packageDir}/package.json`, {
        skipSelf: true
    });
    return result?.id;
}

function formatPackageLocation(loc: PackageLocation) {
    switch (loc.type) {
        case "absolute":
            return `${loc.directory}`;
        case "unresolved":
            return `'${loc.packageName}' required by ${loc.importedFrom}`;
    }
}

const NODE_MODULES_RE = /[\\/]node_modules[\\/]/;

function isLocalPackage(file: string, sourceDir: string) {
    return isInDirectory(file, sourceDir) && !NODE_MODULES_RE.test(file);
}

const PACKAGE_JSON_RE = /[\\/]package\.json($|\?)/;

function isPackageJson(file: string) {
    return PACKAGE_JSON_RE.test(file);
}
