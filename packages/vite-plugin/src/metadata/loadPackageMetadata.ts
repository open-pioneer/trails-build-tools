// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import { ReportableError } from "../ReportableError";
import { fileExists, isInDirectory } from "../utils/fileUtils";
import {
    BUILD_CONFIG_NAME,
    BuildConfig,
    PackageConfig,
    PackageMetadataV1,
    createPackageConfigFromBuildConfig,
    createPackageConfigFromPackageMetadata,
    loadBuildConfig, RuntimeVersion, isRuntimeVersion, canParse, CURRENT_RUNTIME_VERSION,
    RUNTIME_VERSIONS
} from "@open-pioneer/build-common";
import { normalizePath } from "vite";
import { join } from "node:path";
import { createDebugger } from "../utils/debug";
import { InternalPackageMetadata, MetadataContext, PackageDependency } from "./Metadata";
import { PACKAGE_NAME } from "../utils/package";
import { existsSync } from "node:fs";
import posix from "node:path/posix";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:metadata");

/**
 * This function is called to read a package's metadata during build
 * (for internal and external packages).
 *
 * Depending on the location of the package either reads build config (source package)
 * or serialized metadata from package.json.
 */
export async function loadPackageMetadata(
    ctx: MetadataContext,
    packageDir: string,
    sourceRoot: string,
    importedFrom: string | undefined
): Promise<InternalPackageMetadata> {
    return await new PackageMetadataReader(
        ctx,
        packageDir,
        sourceRoot,
        importedFrom
    ).readPackageMetadata();
}

interface PackageConfigResult {
    config: PackageConfig;
    configPath: string;
}

class PackageMetadataReader {
    private ctx: MetadataContext;
    private packageDir: string;
    private sourceRoot: string;
    private packageJsonPath: string;
    private importedFrom: string | undefined;

    constructor(
        ctx: MetadataContext,
        packageDir: string,
        sourceRoot: string,
        importedFrom: string | undefined
    ) {
        this.ctx = ctx;
        this.packageDir = packageDir;
        this.sourceRoot = sourceRoot;
        this.packageJsonPath = join(packageDir, "package.json");
        this.importedFrom = importedFrom;
    }

    /**
     * Reads package metadata for the configured package.
     */
    async readPackageMetadata(): Promise<InternalPackageMetadata> {
        const { ctx, packageDir, packageJsonPath, sourceRoot } = this;
        const mode = isLocalPackage(packageDir, sourceRoot) ? "local" : "external";
        isDebug && debug(`Visiting package directory ${packageDir} in mode ${mode}.`);

        // We must always read at least the package.json to see what kind of package
        // it is and to detects its dependencies.
        ctx.addWatchFile(packageJsonPath);
        const {
            name: packageName,
            version: packageVersion,
            dependencies,
            frameworkMetadata
        } = await parsePackageJson(packageJsonPath);

        // The package config is read either from the package's build.config.mjs (for source packages)
        // or from a package's serialized metadata in its package.json (for published packages).
        // For external packages: if we don't see any Open Pioneer Trails metadata we simply treat it as a plain package,
        // which will then be ignored by further analysis.
        const configResult = await this.readConfig(mode, packageName, frameworkMetadata);
        if (!configResult) {
            return {
                type: "plain",
                name: packageName,
                version: packageVersion,
                directory: packageDir
            };
        }
        const { config, configPath } = configResult;

        let servicesModule: string | undefined;
        if (config.services.size) {
            try {
                servicesModule = await this.getServicesModule(mode, packageName, config);
            } catch (e) {
                throw new ReportableError(
                    `Failed to resolve services entry point for package ${packageDir}`,
                    { cause: e }
                );
            }
        }

        let cssFile: string | undefined;
        if (config.styles) {
            try {
                cssFile = await resolveLocalFile(ctx, packageDir, config.styles);
            } catch (e) {
                throw new ReportableError(`Failed to resolve css file for package ${packageDir}`, {
                    cause: e
                });
            }
            if (!cssFile) {
                throw new ReportableError(
                    `Failed to find css file '${config.styles}' in ${packageDir}`
                );
            }
        }

        const i18nPaths = new Map<string, string>();
        for (const locale of config.languages) {
            if (i18nPaths.has(locale)) {
                throw new ReportableError(`Locale '${locale}' was defined twice in ${configPath}`);
            }
            const path = join(packageDir, "i18n", `${locale}.yaml`);
            i18nPaths.set(locale, normalizePath(path));
        }

        let runtimeVersion: RuntimeVersion;
        if(frameworkMetadata?.runtimeVersion) {
            isDebug && debug(`App runtime of ${packageName} is set to ${frameworkMetadata.runtimeVersion}`);
            runtimeVersion = frameworkMetadata.runtimeVersion;
        } else {
            runtimeVersion = config.runtimeVersion;
        }
        if (!(isRuntimeVersion(runtimeVersion) && canParse(CURRENT_RUNTIME_VERSION, runtimeVersion))) {
            throw new ReportableError(
                `App runtime ${runtimeVersion} of ${packageName} is not supported!
                 Supported versions are: ${RUNTIME_VERSIONS.join(", ")}`
            );
        }
        
        return {
            type: "pioneer-package",
            name: packageName,
            version: packageVersion,
            directory: packageDir,
            packageJsonPath: packageJsonPath,
            servicesModulePath: servicesModule,
            cssFilePath: cssFile,
            i18nPaths,
            get locales() {
                return Array.from(i18nPaths.keys());
            },
            dependencies,
            config: config,
            runtimeVersion: runtimeVersion,
        };
    }

    /**
     * Attempts to read the package's metadata/configuration, depending on mode.
     */
    private async readConfig(
        mode: "local" | "external",
        packageName: string,
        frameworkMetadata: unknown
    ): Promise<PackageConfigResult | undefined> {
        const { ctx, packageDir } = this;
        switch (mode) {
            /** External packages must have framework metadata in their package.json (or they are not considered Open Pioneer Trails packages at all). */
            case "external": {
                if (!frameworkMetadata) {
                    return undefined;
                }
                return this.parsePackageConfigFromMetadata(packageName, frameworkMetadata);
            }
            /** Local packages may have either a build.config (the common case) or a built package.json for testing, but never both. */
            case "local": {
                const buildConfigPath = join(packageDir, BUILD_CONFIG_NAME);
                const buildConfigExists = existsSync(buildConfigPath);
                if (buildConfigExists && frameworkMetadata) {
                    throw new Error(
                        `Package '${packageName}' at ${packageDir} contains both framework metadata in its package.json and a ${BUILD_CONFIG_NAME}.` +
                            ` Mixing both formats is not supported.` +
                            ` Metadata in package.json files is only intended for distributed packages.`
                    );
                }

                if (frameworkMetadata) {
                    ctx.warn(
                        `Using framework metadata from package.json instead of ${BUILD_CONFIG_NAME} in ${packageDir}, make sure that this intended.`
                    );
                    return this.parsePackageConfigFromMetadata(packageName, frameworkMetadata);
                }
                return this.parsePackageConfigFromBuildConfig(buildConfigPath);
            }
        }
    }

    /**
     * Attempts to resolve the package's services entry point (e.g. ./services.ts), depending on mode.
     */
    private async getServicesModule(
        mode: "local" | "external",
        packageName: string,
        config: PackageConfig
    ): Promise<string | undefined> {
        const localServicesModule = config.servicesModule ?? "./services";
        const importedFrom = this.importedFrom;
        if (mode === "external" && importedFrom) {
            /**
             * FIXME: This is a workaround for a weird interaction with vite's dependency optimizer and virtual modules.
             * We are trying to import a real file here (e.g. ./node_modules/.../@open-pioneer/some-package/services.js)
             * and we would like to do so via a fully resolved path.
             *
             * However, when using a fully resolved path AND using vite's dev mode AND if that code used by that file
             * is already used elsewhere in the app (and thus optimized) we end up with a "working" import that produces duplicate code
             * (one copy from vite's optimizer in node_modules/.vite and one copy via the direct fully resolved path).
             *
             * By using an unresolved path we bypass this issue as it appears that vite's resolve pipeline handles this correctly -
             * there is no duplicate code in manual experiments.
             *
             * Because this is an unresolved import (e.g. @open-pioneer/some-package/services) from the app's virtual packages module
             * this package must be reachable from the app. For this reason we currently must use pnpm's "shamefully-hoist" option :(
             */
            return posix.join(packageName, localServicesModule);
        } else {
            return await resolveLocalFile(this.ctx, this.packageDir, localServicesModule);
        }
    }

    /**
     * Attempts to read the package configuration from the package.json's metadata value.
     * Note that the value may not be present at this point if the package does not use Open Pioneer Trails metadata.
     */
    private async parsePackageConfigFromMetadata(
        packageName: string,
        frameworkMetadata: unknown
    ): Promise<PackageConfigResult | undefined> {
        const { packageDir, packageJsonPath } = this;
        const metadataResult = PackageMetadataV1.parsePackageMetadata(frameworkMetadata);
        if (metadataResult.type === "error") {
            if (metadataResult.code === "unsupported-version") {
                throw new ReportableError(
                    `Package '${packageName}' in ${packageDir} uses an unsupported package metadata version.` +
                        ` Try updating ${PACKAGE_NAME}.\n\n` +
                        metadataResult.message,
                    { cause: metadataResult.cause }
                );
            }

            throw new ReportableError(
                `Failed to parse metadata of package '${packageName}' in ${packageDir}: ${metadataResult.message}`,
                { cause: metadataResult.cause }
            );
        }

        return {
            configPath: packageJsonPath,
            config: createPackageConfigFromPackageMetadata(metadataResult.value)
        };
    }

    private async parsePackageConfigFromBuildConfig(
        buildConfigPath: string
    ): Promise<PackageConfigResult | undefined> {
        const { ctx, packageDir } = this;
        let buildConfig: BuildConfig | undefined;
        ctx.addWatchFile(normalizePath(buildConfigPath));
        if (await fileExists(buildConfigPath)) {
            try {
                buildConfig = await loadBuildConfig(buildConfigPath);
            } catch (e) {
                throw new ReportableError(`Failed to load build config ${buildConfigPath}`, {
                    cause: e
                });
            }
        } else {
            throw new ReportableError(`Expected a ${BUILD_CONFIG_NAME} in ${packageDir}`);
        }
        return {
            configPath: buildConfigPath,
            config: createPackageConfigFromBuildConfig(buildConfig)
        };
    }
}

async function parsePackageJson(packageJsonPath: string) {
    if (!(await fileExists(packageJsonPath))) {
        throw new ReportableError(`Expected a 'package.json' file at ${packageJsonPath}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let packageJsonContent: any;
    try {
        packageJsonContent = JSON.parse(await readFile(packageJsonPath, "utf-8"));
    } catch (e) {
        throw new ReportableError(`Failed to read ${packageJsonPath}`, { cause: e });
    }

    const packageName = packageJsonContent.name;
    if (typeof packageName !== "string") {
        throw new ReportableError(`Expected 'name' to be a string in ${packageJsonPath}`);
    }

    const version = packageJsonContent.version;
    if (version != null && typeof version !== "string") {
        throw new ReportableError(`Expected 'version' to be a string in ${packageJsonPath}`);
    }

    const dependencies = packageJsonContent.dependencies ?? {};
    if (typeof dependencies !== "object") {
        throw new ReportableError(`Expected a valid 'dependencies' object in ${packageJsonPath}`);
    }

    const peerDependencies = packageJsonContent.peerDependencies ?? {};
    if (typeof peerDependencies !== "object") {
        throw new ReportableError(
            `Expected a valid 'peerDependencies' object in ${packageJsonPath}`
        );
    }

    const optionalDependencies = packageJsonContent.optionalDependencies ?? {};
    if (typeof optionalDependencies !== "object") {
        throw new ReportableError(
            `Expected a valid 'optionalDependencies' object in ${packageJsonPath}`
        );
    }

    const deps = new Map<string, PackageDependency>();
    const addDep = (packageName: string, optional: boolean) => {
        let dep = deps.get(packageName);
        if (!dep) {
            dep = {
                packageName,
                optional
            };
            deps.set(packageName, dep);
        } else {
            dep.optional &&= optional;
        }
    };

    for (const depName of Object.keys(dependencies)) {
        addDep(depName, false);
    }

    for (const depName of Object.keys(peerDependencies)) {
        addDep(depName, packageJsonContent?.peerDependenciesMeta?.[depName]?.optional ?? false);
    }

    for (const depName of Object.keys(optionalDependencies)) {
        addDep(depName, true);
    }

    const frameworkMetadata = packageJsonContent[PackageMetadataV1.PACKAGE_JSON_KEY] ?? undefined;
    return {
        name: packageName,
        version: version ?? undefined,
        dependencies: Array.from(deps.values()),
        frameworkMetadata: frameworkMetadata
    };
}

async function resolveLocalFile(ctx: MetadataContext, packageDir: string, localModuleId: string) {
    if (!localModuleId.startsWith("./")) {
        localModuleId = `./${localModuleId}`;
    }

    const result = await ctx.resolve(localModuleId, `${packageDir}/package.json`, {
        skipSelf: true
    });
    return result?.id;
}

const NODE_MODULES_RE = /[\\/]node_modules[\\/]/;

function isLocalPackage(file: string, sourceDir: string) {
    return isInDirectory(file, sourceDir) && !NODE_MODULES_RE.test(file);
}
