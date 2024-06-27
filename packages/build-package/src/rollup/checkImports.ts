// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "fs";
import { isAbsolute } from "path";
import { Plugin, PluginContext, ResolvedId } from "rollup";
import { resolve as importMetaResolve, ErrnoException } from "import-meta-resolve";
import { getFileNameWithQuery } from "../utils/pathUtils";
import { fileURLToPath, pathToFileURL } from "url";
import { createDebugger } from "../utils/debug";

export interface CheckImportsOptions {
    packageJson: Record<string, unknown>;
    packageJsonPath: string;
    strict: boolean;
}

const ESM_EXTENSIONS = ["js", "mjs"];

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:check-imports");

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
                    const newModuleId = state!.visitModuleId(this, importedPath, parentId, result);
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

class CheckImportsState {
    private packageJson: Record<string, unknown>;
    private packageJsonPath: string;
    private strict: boolean;
    private hasProblems = false;

    // package name -> package is declared (or not)
    private checkedDependencyDeclarations = new Map<string, boolean>();

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
    visitModuleId(
        ctx: PluginContext,
        moduleId: string,
        parentId: string | undefined,
        resolveResult: ResolvedId | null
    ): string | undefined {
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
        if (!this.checkResolveResult(importCtx, resolveResult)) {
            return newModuleId;
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

    private checkResolveResult(
        importCtx: ImportContext,
        resolveResult: ResolvedId | null
    ): boolean {
        if (!resolveResult) {
            importCtx.warn(
                `Failed to import module '${importCtx.moduleId}'. If the module refers to a dependency, make sure that it is installed correctly in the node_modules directory.`
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
                `Failed to import module '${importCtx.moduleId}', the resolved path '${resolvedPath}' does not exist`
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
            shouldVerifyModuleImports(packageInfo.packageJson, importCtx.moduleId) &&
            importCtx.parentId
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
    return (
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

function shouldVerifyModuleImports(
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
