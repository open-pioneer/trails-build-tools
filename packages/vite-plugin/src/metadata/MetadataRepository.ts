// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import {
    BUILD_CONFIG_NAME,
    isRuntimeVersion,
    PackageMetadataV1,
    RUNTIME_BASE_VERSION,
    RuntimeVersion
} from "@open-pioneer/build-common";
import { realpath } from "fs/promises";
import { basename, dirname } from "path";
import { normalizePath } from "vite";
import { findDepPkgJsonPath } from "vitefu";
import { ReportableError } from "../ReportableError";
import { Cache } from "../utils/Cache";
import { createDebugger } from "../utils/debug";
import {
    AppMetadata,
    InternalPackageMetadata,
    MetadataContext,
    PackageDependency,
    PackageLocation,
    PackageMetadata
} from "./Metadata";
import { loadPackageMetadata } from "./loadPackageMetadata";
import { I18nFile, loadI18nFile } from "./parseI18nYaml";
import { fileExists } from "../utils/fileUtils";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:metadata");

/**
 * Tracks metadata and the files that were used to parse that metadata.
 * watchFiles should be propagated when a caller receives a cached result,
 * otherwise hot reloading may not be triggered correctly on file changes.
 */
interface MetadataEntry {
    metadata: InternalPackageMetadata;
    watchFiles: ReadonlySet<string>;
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
    private packageMetadataCache: Cache<
        string,
        MetadataEntry,
        [ctx: MetadataContext, importedFrom: string | undefined]
    >;

    // Cache for the contents of i18n files.
    // Key: path on disk.
    private i18nCache: Cache<string, I18nEntry, [ctx: MetadataContext]>;

    private runtimeVersion: RuntimeVersion;

    /**
     * @param sourceRoot Source folder on disk, needed to detect 'local' packages
     */
    constructor(sourceRoot: string) {
        this.sourceRoot = sourceRoot;
        this.packageMetadataCache = this.createPackageMetadataCache();
        this.i18nCache = this.createI18nCache();
        this.runtimeVersion = RUNTIME_BASE_VERSION;
        this.readRootPackage(sourceRoot).then((result) => {
            this.runtimeVersion = result;
        });
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
        const packageSeenByDirectory = new Set<string>();
        packageMetadataByName.set(appPackageMetadata.name, appPackageMetadata);
        packageSeenByDirectory.add(appPackageMetadata.directory);

        // Recursively visit all dependencies.
        // Detected metadata is placed into `packageMetadata`.
        const visitDependencies = async (
            dependencies: PackageDependency[],
            importedFrom: string
        ) => {
            const jobs = dependencies.map(async (dependency) => {
                const packageMetadata = await this.getPackageMetadata(ctx, {
                    type: "unresolved",
                    dependency,
                    importedFrom
                });
                if (!packageMetadata) {
                    return;
                }

                if (!packageMetadataByName.has(packageMetadata.name)) {
                    packageMetadataByName.set(packageMetadata.name, packageMetadata);
                }

                if (!packageSeenByDirectory.has(packageMetadata.directory)) {
                    packageSeenByDirectory.add(packageMetadata.directory);

                    await visitDependencies(
                        packageMetadata.dependencies,
                        packageMetadata.packageJsonPath
                    );
                } else {
                    isDebug &&
                        debug(`Skipping already visited package at %s`, packageMetadata.directory);
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
            appPackage: appPackageMetadata,
            packages: Array.from(packageMetadataByName.values())
        };
        return appMetadata;
    }

    /**
     * Returns package metadata associated with the given package.
     */
    private async getPackageMetadata(
        ctx: MetadataContext,
        loc: PackageLocation
    ): Promise<PackageMetadata | undefined> {
        isDebug && debug(`Request for package metadata of ${formatPackageLocation(loc)}`);

        const packageDir = await this.resolvePackageLocation(loc);
        if (!packageDir) {
            // Optional package does not exist
            return undefined;
        }

        const importedFrom = loc.type === "absolute" ? undefined : loc.importedFrom;
        const entry = await this.packageMetadataCache.get(packageDir, ctx, importedFrom);
        propagateWatchFiles(entry.watchFiles, ctx);

        if (entry.metadata.type === "plain") {
            isDebug && debug(`Skipping package '${packageDir}'.`);
            return undefined;
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

    getRuntimeVersion(): RuntimeVersion {
        return this.runtimeVersion;
    }

    private async resolvePackageLocation(loc: PackageLocation) {
        if (loc.type === "absolute") {
            return await realpath(loc.directory);
        }

        const { packageName, optional } = loc.dependency;

        const packagePath = await findDepPkgJsonPath(packageName, loc.importedFrom);
        if (!packagePath) {
            if (optional) {
                isDebug && debug(`Optional package '${packageName}' was not found.`);
                return undefined;
            }

            throw new ReportableError(
                `Failed to find package '${packageName}' (from '${loc.importedFrom}'), is the dependency installed correctly?`
            );
        }

        const packageDir = dirname(await realpath(packagePath));
        isDebug && debug(`Found package '${packageName}' at ${packageDir}`);
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

    private async readRootPackage(sourceRoot: string): Promise<RuntimeVersion> {
        isDebug && debug(`Read root package for runtime version ${sourceRoot}`);
        const sourcePackageJSON = join(sourceRoot, "..", "package.json");
        if (!(await fileExists(sourcePackageJSON))) {
            isDebug && debug(`No root package for runtime version ${sourceRoot} found`);
            return RUNTIME_BASE_VERSION;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let packageJsonContent: any;
        try {
            packageJsonContent = JSON.parse(await readFile(sourcePackageJSON, "utf-8"));
        } catch (e) {
            throw new ReportableError(`Failed to read ${sourcePackageJSON}`, { cause: e });
        }
        const frameworkMetadata =
            packageJsonContent[PackageMetadataV1.PACKAGE_JSON_KEY] ?? undefined;
        if (frameworkMetadata && isRuntimeVersion(frameworkMetadata.runtimeVersion)) {
            isDebug && debug(`Set runtime version to  ${frameworkMetadata.runtimeVersion}`);
            return frameworkMetadata.runtimeVersion;
        } else {
            throw new ReportableError(
                `Unsupported runtime version ${frameworkMetadata.runtimeVersion}`
            );
        }
    }

    private createPackageMetadataCache(): typeof this.packageMetadataCache {
        const sourceRoot = this.sourceRoot;
        const provider = {
            _byName: new Map<string, PackageMetadata>(),

            getId(directory: string) {
                return normalizePath(directory);
            },
            async getValue(
                directory: string,
                ctx: MetadataContext,
                importedFrom: string | undefined
            ): Promise<MetadataEntry> {
                isDebug &&
                    debug(
                        `Loading metadata for package at ${directory} (imported from ${
                            importedFrom ?? "N/A"
                        })`
                    );

                // Track watch files to ensure that other files also depend on these files
                // when a cached entry is returned.
                const watchFiles = new Set<string>();
                const trackingCtx: MetadataContext = {
                    resolve: ctx.resolve.bind(ctx),
                    addWatchFile(id) {
                        ctx.addWatchFile(id);
                        watchFiles.add(id);
                    },
                    warn: ctx.warn.bind(ctx)
                };

                const metadata = await loadPackageMetadata(
                    trackingCtx,
                    directory,
                    sourceRoot,
                    importedFrom
                );
                isDebug && debug(`Metadata for '${metadata.name}': %O`, metadata);

                // Ensure only one version of a package exists in the app
                if (metadata.type === "pioneer-package") {
                    const existingMetadata = this._byName.get(metadata.name);
                    if (
                        existingMetadata &&
                        normalizePath(existingMetadata.directory) !==
                            normalizePath(metadata.directory)
                    ) {
                        const message =
                            `Encountered the package '${metadata.name}' at two different locations.\n` +
                            `Trails packages cannot be used more than once in the same application.\n` +
                            `All packages must use a common version of '${metadata.name}'.\n` +
                            `\n` +
                            `1. ${formatPackage(existingMetadata)}\n` +
                            `\n` +
                            `2. ${formatPackage(metadata)}`;
                        throw new ReportableError(message);
                    }

                    this._byName.set(metadata.name, metadata);
                }

                return {
                    metadata,
                    watchFiles
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

function formatPackageLocation(loc: PackageLocation) {
    switch (loc.type) {
        case "absolute":
            return `${loc.directory}`;
        case "unresolved": {
            let name = `'${loc.dependency.packageName}'`;
            if (loc.dependency.optional) {
                name += " (optional)";
            }
            return `${name} required by ${loc.importedFrom}`;
        }
    }
}

const PACKAGE_JSON_RE = /[\\/]package\.json($|\?)/;

function isPackageJson(file: string) {
    return PACKAGE_JSON_RE.test(file);
}

function isBuildConfig(file: string) {
    return basename(file) === BUILD_CONFIG_NAME;
}

function formatPackage(packageMetadata: PackageMetadata) {
    let str = `${packageMetadata.name}`;
    if (packageMetadata.version != null) {
        str += `@${packageMetadata.version}`;
    }
    str += ` at ${packageMetadata.directory}`;
    return str;
}
