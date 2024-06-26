// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "fs";
import { isAbsolute } from "path";
import { Plugin, PluginContext, ResolvedId } from "rollup";
import { getFileNameWithQuery } from "./resolve";

export interface CheckImportsOptions {
    packageJson: Record<string, unknown>;
    packageJsonPath: string;
    strict: boolean;
}

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

export function checkImportsPlugin({
    packageJson,
    packageJsonPath,
    strict
}: CheckImportsOptions): Plugin {
    let state: CheckImportsState | undefined;
    return {
        name: "check-imports",
        buildStart() {
            state = new CheckImportsState(packageJson, packageJsonPath, strict);
        },
        buildEnd() {
            state!.finish(this);
            state = undefined;
        },
        resolveId: {
            order: "pre",
            async handler(moduleId, importer, options) {
                // Recursive invocation triggered by rollup's node resolve plugin.
                // We allow the import but remap it to external, because node modules
                // must not be bundled.
                const nodeResolveData = options?.custom?.["node-resolve"] as
                    | NodeResolveData
                    | undefined;
                if (nodeResolveData) {
                    // Side channel to register the actual location on disk.
                    // Cannot use rollup's meta mechanism because it is not propagated by the node-resolve plugin
                    // when making the module external.
                    state!.registerNodeModuleLocation(
                        nodeResolveData.importee,
                        nodeResolveData.resolved.id
                    );
                    return {
                        id: nodeResolveData.importee,
                        external: true
                    };
                }

                const result = await this.resolve(moduleId, importer, options);
                const importedPath = result?.id ?? moduleId;
                if (!result || (result.external && !isAbsolute(result.id))) {
                    state!.visitModuleId(this, importedPath, importer, result);
                }
                return result ?? false;
            }
        }
    };
}

interface ImportContext {
    moduleId: string;

    warn(warning: string): void;
}

class CheckImportsState {
    private packageJson: Record<string, unknown>;
    private packageJsonPath: string;
    private strict: boolean;
    private hasProblems = false;

    // package name -> package is declared (or not)
    private checkedDependencyDeclarations = new Map<string, boolean>();

    // module id -> file path
    private nodeModulesOnDisk = new Map<string, string>();

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
        importer: string | undefined,
        resolveResult: ResolvedId | null
    ) {
        let packageName;
        try {
            packageName = parsePackageName(moduleId);
        } catch (e) {
            ctx.error({
                id: importer,
                message: `Failed to parse package name from imported module ${moduleId}`,
                cause: e
            });
        }
        if (!packageName) {
            return;
        }

        const importCtx: ImportContext = {
            moduleId,
            warn: (warning: string) => {
                this.hasProblems = true;
                ctx.warn({ message: warning, id: importer });
            }
        };

        if (!this.checkDependencyIsDeclared(packageName, importCtx)) {
            return;
        }
        this.checkResolveResult(importCtx, resolveResult);
    }

    registerNodeModuleLocation(id: string, path: string) {
        this.nodeModulesOnDisk.set(id, path);
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
        if (!declared) {
            this.hasProblems = true;
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
            importCtx.warn(`Failed to import module '${importCtx.moduleId}'`);
            return false;
        }

        // Check if the resolved module actually exists on disk.
        // If the module was resolved via nodeResolve, then the actual path is transported via meta attributes.
        const resolvedPath = this.nodeModulesOnDisk.get(resolveResult.id) ?? resolveResult.id;
        if (resolvedPath.startsWith("\0") || !isAbsolute(resolvedPath)) {
            return true; // no validation
        }

        const { fileName } = getFileNameWithQuery(resolvedPath);
        if (!existsSync(fileName)) {
            importCtx.warn(
                `Failed to import module '${importCtx.moduleId}', the resolved path '${resolvedPath}' does not exist`
            );
            return false;
        }

        return true;
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
