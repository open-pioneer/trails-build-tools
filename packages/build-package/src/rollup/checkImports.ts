// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { BUILD_CONFIG_NAME, loadBuildConfig } from "@open-pioneer/build-common";
import { existsSync, lstatSync, realpathSync } from "fs";
import { ErrnoException, resolve as importMetaResolve } from "import-meta-resolve";
import { dirname, isAbsolute, join } from "path";
import { Plugin, PluginContext, ResolvedId } from "rollup";
import { fileURLToPath, pathToFileURL } from "url";
import { loadPackageJson } from "../model/InputModel";
import { getEntryPointsFromBuildConfig } from "../model/PackageModel";
import { createDebugger } from "../utils/debug";
import { NormalizedEntryPoint } from "../utils/entryPoints";
import { getFileNameWithQuery } from "../utils/pathUtils";

export interface CheckImportsOptions {
    packageJson: Record<string, unknown>;
    packageJsonPath: string;
    strict: boolean;
}

const ESM_EXTENSIONS = ["js", "mjs"];

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:check-imports");
// const debug = console.info.bind(console);

/**
 * Plugin data exposed by the node-resolve plugin.
 *
 * See https://www.npmjs.com/package/@rollup/plugin-node-resolve#resolve-options
 **/
interface NodeResolveData {
    /** The import in the source file (not resolved). */
    importee: string;

    /** The resolved module. */
    resolved: {
        id: string;
        moduleSideEffects: unknown;
    };
}

/**
 * Package info provided by the node-resolve plugin.
 */
interface NodeResolvePackageInfo {
    packageJson: Record<string, unknown> | undefined;
    packageJsonPath: string | undefined;
    // ...
}

export function checkImportsPlugin({
    packageJson,
    packageJsonPath,
    strict
}: CheckImportsOptions): Plugin {
    let state: CheckImportsState | undefined;
    let getPackageInfo: (id: string) => NodeResolvePackageInfo | undefined;

    return {
        name: "check-imports",
        buildStart({ plugins }) {
            const nodeResolvePlugin = plugins.find((p) => p.name === "node-resolve");
            if (!nodeResolvePlugin) {
                throw new Error("check-imports requires the node-resolve plugin to be present");
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            getPackageInfo = (nodeResolvePlugin as any).getPackageInfoForId;
            if (typeof getPackageInfo !== "function") {
                throw new Error(
                    "check-imports could not find the node-resolve plugin's getPackageInfoForId function."
                );
            }

            state = new CheckImportsState(packageJson, packageJsonPath, strict);
        },
        buildEnd() {
            state!.finish(this);
            state = undefined;
        },
        resolveId: {
            order: "pre",
            async handler(moduleId, parentId, options) {
                // Recursive invocation triggered by rollup's node resolve plugin.
                // We allow the import but remap it to external, because node modules
                // must not be bundled.
                const nodeResolveData = options?.custom?.["node-resolve"] as
                    | NodeResolveData
                    | undefined;
                if (nodeResolveData) {
                    isDebug &&
                        debug(
                            "Registering resolved node module %s at %s",
                            nodeResolveData.importee,
                            nodeResolveData.resolved.id
                        );
                    // Side channel to register the actual location on disk.
                    // Cannot use rollup's meta mechanism because it is not propagated by the node-resolve plugin
                    // when making the module external.
                    const packageInfo = getPackageInfo(nodeResolveData.resolved.id);
                    state!.registerNodeModuleLocation(
                        nodeResolveData.importee,
                        nodeResolveData.resolved.id,
                        packageInfo
                    );
                    return {
                        id: nodeResolveData.importee,
                        external: true
                    };
                }

                const result = await this.resolve(moduleId, parentId, options);
                const importedPath = result?.id ?? moduleId;
                if (!result || (result.external && !isAbsolute(result.id))) {
                    const newModuleId = await state!.visitModuleId(
                        this,
                        importedPath,
                        parentId,
                        result
                    );
                    if (newModuleId) {
                        isDebug && debug("Rewriting import %s to %s", importedPath, newModuleId);
                        return {
                            id: newModuleId,
                            external: true
                        };
                    }
                }
                return result ?? false;
            }
        }
    };
}

interface ImportContext {
    moduleId: string;
    parentId: string | undefined;

    warn(warning: string): void;
    rewrite(newModuleId: string): void;
}

interface TrailsPackageInfo {
    // Path in node modules, usually a symlink
    rawPackagePath: string;

    // Resolved path on disk
    resolvedPackagePath: string;

    packageJson: Record<string, unknown>;

    // Parsed entry points from build config
    entryPointsByModuleId: Map<string, NormalizedEntryPoint>;
    servicesEntryPoint: NormalizedEntryPoint | undefined;
}

class CheckImportsState {
    private packageJson: Record<string, unknown>;
    private packageJsonPath: string;
    private strict: boolean;
    private hasProblems = false;

    // package name -> package is declared (or not)
    private checkedDependencyDeclarations = new Map<string, boolean>();

    // package name -> trails info (or undefined, if no trails package)
    private trailsInfoCache = new Map<
        string,
        {
            result: TrailsPackageInfo | undefined;
            promise: Promise<void>;
        }
    >();

    // module id -> file path and package metadata
    private nodeModulesOnDisk = new Map<
        string,
        { path: string; packageInfo: NodeResolvePackageInfo | undefined }
    >();

    constructor(packageJson: Record<string, unknown>, packageJsonPath: string, strict: boolean) {
        this.packageJson = packageJson;
        this.packageJsonPath = packageJsonPath;
        this.strict = strict;
    }

    /**
     * Visits the given module id and performs some dependency checks
     *
     * - the package must be declared in the package.json as a dependency
     * - the module must actually exist on disk
     */
    async visitModuleId(
        ctx: PluginContext,
        moduleId: string,
        parentId: string | undefined,
        resolveResult: ResolvedId | null
    ): Promise<string | undefined> {
        isDebug && debug("Visiting module %s from %s", moduleId, parentId);

        let newModuleId: string | undefined = undefined;
        let packageName;
        try {
            packageName = parsePackageName(moduleId);
        } catch (e) {
            ctx.error({
                id: parentId,
                message: `Failed to parse package name from imported module ${moduleId}`,
                cause: e
            });
        }
        if (!packageName) {
            return newModuleId;
        }

        const importCtx: ImportContext = {
            moduleId,
            parentId,
            warn: (warning: string) => {
                this.hasProblems = true;
                ctx.warn({ message: warning, id: parentId });
            },
            rewrite(id) {
                newModuleId = id;
            }
        };

        if (!this.checkDependencyIsDeclared(packageName, importCtx)) {
            return newModuleId;
        }

        const trailsPackageInfo = await this.detectTrailsPackage(packageName);
        if (trailsPackageInfo) {
            if (!this.checkTrailsPackageImport(importCtx, trailsPackageInfo, packageName)) {
                return newModuleId;
            }
        } else {
            if (!this.checkResolveResult(importCtx, resolveResult)) {
                return newModuleId;
            }
        }
        return newModuleId;
    }

    registerNodeModuleLocation(
        id: string,
        path: string,
        packageInfo: NodeResolvePackageInfo | undefined
    ) {
        this.nodeModulesOnDisk.set(id, { path, packageInfo });
    }

    finish(ctx: PluginContext) {
        if (this.strict && this.hasProblems) {
            ctx.error({
                message: "Aborting due to dependency problems (strict validation is enabled)."
            });
        }
    }

    /**
     * Emits an error if the given package is not listed as a dependency.
     */
    private checkDependencyIsDeclared(packageName: string, importCtx: ImportContext): boolean {
        const cachedValue = this.checkedDependencyDeclarations.get(packageName);
        if (cachedValue != null) {
            return cachedValue;
        }

        const declared = isDeclaredDependency(packageName, this.packageJson);
        isDebug && debug("Package %s is declared: %s", packageName, declared);
        if (!declared) {
            importCtx.warn(
                `Failed to import '${importCtx.moduleId}', the package '${packageName}' must` +
                    ` be configured either as a dependency or as a peerDependency in ${this.packageJsonPath}`
            );
        }
        this.checkedDependencyDeclarations.set(packageName, declared);
        return declared;
    }

    /**
     * Checks the result of the node style resolution.
     */
    private checkResolveResult(
        importCtx: ImportContext,
        resolveResult: ResolvedId | null
    ): boolean {
        if (!resolveResult) {
            importCtx.warn(
                `Failed to import '${importCtx.moduleId}'. If the module refers to a dependency, make sure that it is installed correctly in the node_modules directory.`
            );
            return false;
        }

        // Check if the resolved module actually exists on disk.
        // If the module was resolved via nodeResolve, then the actual path is transported via meta attributes.
        const { path: resolvedPath, packageInfo } = this.nodeModulesOnDisk.get(
            resolveResult.id
        ) ?? { path: resolveResult.id, packageInfo: undefined };
        if (resolvedPath.startsWith("\0") || !isAbsolute(resolvedPath)) {
            return true; // no validation
        }

        // The resolved path must exist on disk.
        const { fileName: resolvedFileName } = getFileNameWithQuery(resolvedPath);
        const resolvedFileExists = existsSync(resolvedFileName);
        isDebug && debug("Resolved path %s exists: %s", resolvedPath, resolvedFileExists);
        if (!resolvedFileExists) {
            importCtx.warn(
                `Failed to import '${importCtx.moduleId}', the resolved path '${resolvedPath}' does not exist`
            );
            return false;
        }

        // Compatibility for ecma script imports with missing extensions.
        // Technically, node requires explicit extensions when importing a module such as "ol/Map.js" (ol/Map is not correct).
        // However, bundlers such as vite (and rollup's node resolve) handle this leniently, as does TypeScript (with bundler resolution).
        // The following block adds a file extensions under certain conditions.
        // See also https://github.com/open-pioneer/trails-openlayers-base-packages/issues/314
        if (
            packageInfo &&
            importCtx.parentId &&
            shouldEnableModuleImportCompatibility(packageInfo.packageJson, importCtx.moduleId)
        ) {
            const moduleId = importCtx.moduleId;
            const parentId = importCtx.parentId;
            isDebug && debug("Running additional module compatibility for %s", moduleId);

            const resolvedFileExtension = ESM_EXTENSIONS.find((ext) =>
                resolvedFileName.endsWith(`.${ext}`)
            );
            if (resolvedFileExtension && !moduleId.endsWith(`.${resolvedFileExtension}`)) {
                const newModuleId = moduleId + `.${resolvedFileExtension}`;
                if (tryNodeImport(newModuleId, parentId) === "found") {
                    isDebug && debug("Importing %s instead of %s", newModuleId, moduleId);
                    importCtx.rewrite(newModuleId);
                }
            }
        }
        return true;
    }

    /**
     * Checks whether the given import into the trails dependency is allowed.
     * Only public entry points defined by the package are allowed, anything else is an error.
     *
     * We don't check that those files actually exist.
     * If they would not, _that_ package's build will fail.
     */
    private checkTrailsPackageImport(
        importCtx: ImportContext,
        trailsInfo: TrailsPackageInfo,
        packageName: string
    ): boolean {
        const moduleId = importCtx.moduleId;

        // Extract the module part after the package name
        let relativeModuleId;
        if (moduleId === packageName || moduleId.startsWith(`${packageName}/`)) {
            relativeModuleId = moduleId.substring(packageName.length);
            if (relativeModuleId.startsWith("/")) {
                relativeModuleId = relativeModuleId.substring(1);
            }
        } else {
            // Can this happen?
            throw new Error(`Internal error: expected '${moduleId}' to start with ${packageName}`);
        }

        // Use the 'main' field as a fallback
        let packageMain = trailsInfo.packageJson.main as string | undefined;
        if (packageMain) {
            packageMain = packageMain.replace(/\.[^/.]+$/, ""); // strip extension
        }
        if (!relativeModuleId) {
            relativeModuleId = packageMain || "index";
        }

        isDebug &&
            debug(
                "Checking relative module id '%s' in trails package %s",
                relativeModuleId,
                packageName
            );

        // The module must be an entry point.
        const entryPoint = trailsInfo.entryPointsByModuleId.get(relativeModuleId);
        if (!entryPoint) {
            importCtx.warn(
                `Failed to import '${moduleId}': '${relativeModuleId}' is not an entry point of ${packageName}`
            );
            return false;
        }

        // It must _not_ be the services entry point.
        if (
            trailsInfo.servicesEntryPoint &&
            trailsInfo.servicesEntryPoint.outputModuleId === entryPoint.outputModuleId
        ) {
            importCtx.warn(
                `Failed to import '${moduleId}': the module is the package's services entry point, which should not be imported directly`
            );
            return false;
        }
        return true;
    }

    /**
     * Checks whether the given package is a linked trails package during development.
     */
    private async detectTrailsPackage(packageName: string): Promise<TrailsPackageInfo | undefined> {
        let cacheEntry = this.trailsInfoCache.get(packageName);
        if (!cacheEntry) {
            cacheEntry = {
                result: undefined,
                promise: this.detectTrailsPackageImpl(packageName).then((result) => {
                    cacheEntry!.result = result;
                })
            };
            this.trailsInfoCache.set(packageName, cacheEntry);
        }

        await cacheEntry.promise;
        return cacheEntry.result;
    }

    private async detectTrailsPackageImpl(
        packageName: string
    ): Promise<TrailsPackageInfo | undefined> {
        const thisPackageDir = dirname(this.packageJsonPath);
        const importedPackageDir = join(thisPackageDir, "node_modules", packageName);
        if (!existsSync(importedPackageDir)) {
            isDebug && debug("Dependency %s does not exist in package's node_modules", packageName);
            return undefined;
        }

        const realImportedPackageDir = realpathSync(importedPackageDir);
        const buildConfigPath = join(importedPackageDir, BUILD_CONFIG_NAME);
        const isSymlink = lstatSync(importedPackageDir).isSymbolicLink();
        const hasBuildConfig = existsSync(buildConfigPath);
        const isLinkedTrailsPackage = isSymlink && hasBuildConfig;
        isDebug &&
            debug(
                "Checking if %s is a linked trails package: %s (symlink: %s, build config: %s)",
                thisPackageDir,
                isLinkedTrailsPackage,
                isSymlink,
                hasBuildConfig
            );

        if (!isLinkedTrailsPackage) {
            return undefined;
        }

        let packageJson;
        try {
            packageJson = await loadPackageJson(join(realImportedPackageDir, "package.json"));
        } catch (e) {
            throw new Error(`Failed to load package json for package ${packageName}`, { cause: e });
        }

        try {
            const buildConfig = await loadBuildConfig(buildConfigPath);
            const { jsEntryPointsByModuleId, servicesEntryPoint } = getEntryPointsFromBuildConfig(
                realImportedPackageDir,
                buildConfig,
                buildConfigPath,
                undefined,
                (..._args) => undefined // don't report anything for foreign packages
            );

            const result: TrailsPackageInfo = {
                rawPackagePath: importedPackageDir,
                resolvedPackagePath: realImportedPackageDir,
                packageJson,
                entryPointsByModuleId: jsEntryPointsByModuleId,
                servicesEntryPoint
            };
            isDebug && debug("Detected trails package %s: %O", packageName, result);
            return result;
        } catch (e) {
            throw new Error(`Failed to parse package information for ${packageName}`, { cause: e });
        }
    }
}

function tryNodeImport(moduleId: string, parentFile: string): "found" | "not-found" | "error" {
    try {
        const fileUrl = importMetaResolve(moduleId, pathToFileURL(parentFile).href);
        const filePath = fileURLToPath(fileUrl);
        const result = existsSync(filePath) ? "found" : "not-found";
        isDebug && debug("Node module resolve of %s: %s (%s)", moduleId, filePath, result);
        return result;
    } catch (e: unknown) {
        const error = e as ErrnoException;
        const result = error.code === "ERR_MODULE_NOT_FOUND" ? "not-found" : "error";
        isDebug && debug("Node module resolve of %s: %s (%s)", moduleId, error.code, result);
        return result;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isDeclaredDependency(packageName: string, packageJson: Record<string, any>): boolean {
    return !!(
        packageJson?.dependencies?.[packageName] ||
        packageJson?.peerDependencies?.[packageName] ||
        false
    );
}

function parsePackageName(absoluteId: string): string | undefined {
    // NOTE: \0 (zero byte) is ignored because it is usually used internally in rollup
    // for plugin-generated virtual modules.
    if (absoluteId.includes("\0")) {
        return undefined;
    }

    let match: string | null | undefined;
    if (absoluteId.startsWith("@")) {
        match = absoluteId.match(/^@[^/]+\/[^/]+/)?.[0];
    } else {
        match = absoluteId.match(/^[^/]+/)?.[0];
    }

    if (!match) {
        throw new Error(`Invalid import id: '${absoluteId}'`);
    }
    return match;
}

function shouldEnableModuleImportCompatibility(
    packageJson: Record<string, unknown> | undefined,
    moduleId: string
): boolean {
    if (!packageJson || typeof packageJson !== "object") {
        return false;
    }

    // If exports is defined, then we assume the rollup node resolve plugin did it's job already.
    if (packageJson.type !== "module" || packageJson.exports != null) {
        return false;
    }

    // Only run for deep imports.
    const name = packageJson.name;
    return !name || moduleId.startsWith(`${name}/`);
}
