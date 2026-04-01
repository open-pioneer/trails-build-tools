// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { RuntimeSupport } from "@open-pioneer/build-common";
import type { Plugin as EsbuildPlugin } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { cwd } from "node:process";
import { PluginContext } from "rollup";
import { normalizePath, UserConfig, Plugin as VitePlugin } from "vite";
import { ReportableError } from "./ReportableError";
import { generateAppMetadata } from "./codegen/generateAppMetadata";
import { generateCombinedCss } from "./codegen/generateCombinedCss";
import { generateI18nIndex, generateI18nMessages } from "./codegen/generateI18n";
import { generatePackagesMetadata } from "./codegen/generatePackagesMetadata";
import { findPackageJson, parseVirtualModuleId, serializeModuleId } from "./codegen/shared";
import { DeploymentModule } from "./deployment";
import { createMetadataContextFromRollup } from "./metadata/Context";
import { MetadataRepository } from "./metadata/MetadataRepository";
import { findTrailsPackages } from "./metadata/findTrailsPackages";
import { createDebugger } from "./utils/debug";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:codegen");

export function codegenPlugin(): VitePlugin {
    let isDev!: boolean;
    let rootDir!: string;
    let repository!: MetadataRepository;
    let deploymentModule!: DeploymentModule;

    return {
        name: "pioneer:codegen",

        async config(userConfig, env) {
            isDev = env.command === "serve";
            rootDir = userConfig.root ?? cwd();
            repository = new MetadataRepository(rootDir);

            if (isDev) {
                await configureDevOptimizer(userConfig, rootDir);
            }
        },

        configResolved(config) {
            deploymentModule = new DeploymentModule(isDev, config.base);
        },

        async buildStart(this: PluginContext) {
            repository?.reset();
            deploymentModule.onStart(this);
        },

        async resolveId(this: PluginContext, moduleId, importer) {
            try {
                if (!importer) {
                    return undefined;
                }

                if (parseVirtualModuleId(moduleId)) {
                    return moduleId;
                }

                let virtualModule;
                try {
                    virtualModule = RuntimeSupport.parseVirtualModule(moduleId);
                } catch (e) {
                    this.error({
                        id: moduleId,
                        message: "Invalid virtual module id",
                        cause: e
                    });
                }

                switch (virtualModule) {
                    case "app":
                        return serializeModuleId({
                            type: "app-meta",
                            packageDirectory: getPackageDirectoryFromImporter(importer, rootDir)
                        });
                    case "react-hooks":
                        return serializeModuleId({
                            type: "package-hooks",
                            packageDirectory: getPackageDirectoryFromImporter(importer, rootDir)
                        });
                    case "source-info":
                        return serializeModuleId({
                            type: "source-info",
                            modulePath: importer,
                            packageDirectory: getPackageDirectoryFromImporter(importer, rootDir)
                        });
                    case "deployment":
                        return serializeModuleId({
                            type: "deployment"
                        });
                }
            } catch (e) {
                reportError(this, e, isDev);
            }
        },

        async load(this: PluginContext, moduleId) {
            try {
                const mod = parseVirtualModuleId(moduleId);
                if (!mod) {
                    return undefined;
                }

                isDebug && debug("Loading virtual module %O", mod);

                if (mod.type === "deployment") {
                    return deploymentModule.onLoadModule();
                }

                const packageJsonPath = await resolvePackageJson(this, mod);
                if (mod.type === "package-hooks") {
                    const packageName = await getPackageName(this, packageJsonPath);
                    const generatedSourceCode = RuntimeSupport.generateReactHooks(
                        packageName,
                        RuntimeSupport.REACT_INTEGRATION_MODULE_ID
                    );
                    isDebug && debug("Generated hooks code: %O", generatedSourceCode);
                    return generatedSourceCode;
                }

                if (mod.type === "source-info") {
                    const packageName = await getPackageName(this, packageJsonPath);
                    return RuntimeSupport.generateSourceInfo(packageName, mod.modulePath);
                }

                if (mod.type === "app-meta") {
                    return generateAppMetadata(
                        mod.packageDirectory,
                        RuntimeSupport.METADATA_MODULE_ID
                    );
                }

                const ctx = createMetadataContextFromRollup(this);
                const appMetadata = await repository.getAppMetadata(ctx, dirname(packageJsonPath));
                switch (mod.type) {
                    case "app-packages": {
                        const generatedSourceCode = generatePackagesMetadata({
                            appName: appMetadata.name,
                            packages: appMetadata.packages
                        });
                        isDebug && debug("Generated app metadata: %O", generatedSourceCode);
                        return generatedSourceCode;
                    }
                    case "app-css": {
                        const generatedSourceCode = generateCombinedCss(appMetadata.packages);
                        isDebug && debug("Generated app css: %O", generatedSourceCode);
                        return generatedSourceCode;
                    }
                    case "app-i18n-index": {
                        const generatedSourceCode = generateI18nIndex(
                            mod.packageDirectory,
                            appMetadata.locales
                        );
                        isDebug && debug("Generated i18n lookup: %O", generatedSourceCode);
                        return generatedSourceCode;
                    }
                    case "app-i18n": {
                        const generatedSourceCode = await generateI18nMessages({
                            locale: mod.locale,
                            appName: appMetadata.name,
                            packages: appMetadata.packages,
                            loadI18n: (path) => {
                                return repository.getI18nFile(ctx, path);
                            }
                        });
                        isDebug && debug("Generated i18n messages: %O", generatedSourceCode);
                        return generatedSourceCode;
                    }
                }
            } catch (e) {
                reportError(this, e, isDev);
            }
        },

        watchChange(id, _change) {
            isDebug && debug("File %s changed", id);
            repository.onFileChanged(id);
        },

        generateBundle(_options, bundle) {
            deploymentModule.onGenerateBundle(bundle);
        }
    };
}

async function resolvePackageJson(
    ctx: PluginContext,
    mod: { packageDirectory: string }
): Promise<string> {
    // During development we will observe directories like "/packages/foo" (i.e. not fully resolved).
    // This uses the dev server to attempt to resolve the directory back to a complete path.
    // Hit me up if you know a better way to do this.
    const path = (await ctx.resolve(mod.packageDirectory + "/package.json"))?.id;
    if (!path) {
        throw new ReportableError(`Failed to resolve package.json in ${mod.packageDirectory}`);
    }
    return path;
}

async function configureDevOptimizer(userConfig: UserConfig, rootDir: string) {
    const optimizeDeps = (userConfig.optimizeDeps ??= {});

    // Include trails modules in deps optimizer settings
    const includes = (optimizeDeps.include ??= []);
    const trailsModules = await getOptimizeDepsIncludes(rootDir);
    includes.push(...trailsModules);

    // Mark trails modules in node dependencies as `external` from esbuild's POV
    // so they can be handled by our vite plugin.
    const esbuildOptions = (optimizeDeps.esbuildOptions ??= {});
    const plugins = (esbuildOptions.plugins ??= []);
    plugins.push(createOptimizeDepsEsbuildPlugin());
}

/**
 * Find external trails packages and add their services modules (if any)
 * to vite's `optimizeDeps.include`.
 *
 * This should reduce the number of `✨ optimized dependencies changed. reloading` events during development.
 *
 * NOTE: A better solution would be to teach vite's dependency optimizer how to interpret "open-pioneer:*",
 * so that it accurately understands the actual additional imports from trails into node modules (i.e. all services etc.).
 *
 * I couldn't get the esbuild plugin working, however.
 * This could be reattempted when vite has migrated to rolldown.
 */
async function getOptimizeDepsIncludes(rootDir: string) {
    const trailsPackages = await findTrailsPackages(rootDir);
    const trailsModules = trailsPackages.flatMap((pkg) => {
        if (!/[/\\]node_modules[/\\]/.test(pkg.directory)) {
            return [];
        }

        const serviceModule = pkg.servicesModuleId;
        return serviceModule ? [serviceModule] : [];
    });
    trailsModules.push(`${RuntimeSupport.RUNTIME_PACKAGE_NAME}/**`);

    isDebug && debug("Optimizing additional modules %O", trailsModules);
    return trailsModules;
}

/**
 * Creates an esbuild plugin for use during Vite's dependency optimization phase.
 * It marks all `open-pioneer:*` virtual module imports as external so that they
 * are left untouched by esbuild and can later be handled by the normal Vite plugin.
 */
function createOptimizeDepsEsbuildPlugin(): EsbuildPlugin {
    return {
        name: "pioneer:optimize-deps",
        setup(build) {
            build.onResolve({ filter: /^open-pioneer:/ }, (args) => {
                return { external: true, path: args.path };
            });
        }
    };
}

function reportError(ctx: PluginContext, error: unknown, isDev: boolean) {
    let message: string;
    if (error instanceof ReportableError) {
        message = error.message;
    } else {
        message = "Internal error: " + (String((error as Error)?.message) || "Unknown error");
    }

    // Vite will currently only render the top level error, not its causes.
    if (isDev) {
        for (const cause of getCauseMessages(error)) {
            message += "\n\n";
            message += `Caused by: ${cause}`;
        }
    }

    ctx.error({
        message: message,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cause: (error as any).cause,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stack: (error as any).stack
    });
}

function getPackageDirectoryFromDirectory(directory: string, rootDir: string): string {
    const packageJsonPath = findPackageJson(directory, rootDir);
    if (!packageJsonPath) {
        throw new ReportableError(`Failed to find package.json for package from '${directory}'.`);
    }

    const packageDir = dirname(packageJsonPath);
    return normalizePath(packageDir);
}

function getPackageDirectoryFromImporter(importer: string, rootDir: string): string {
    return getPackageDirectoryFromDirectory(dirname(importer), rootDir);
}

async function getPackageName(ctx: PluginContext, packageJsonPath: string) {
    let name: string;
    try {
        const content = await readFile(packageJsonPath, "utf-8");
        name = JSON.parse(content).name;
    } catch (e) {
        throw new ReportableError(`Failed to read package.json file`, { cause: e });
    }
    if (!name) {
        throw new ReportableError(`Failed to read package name from ${packageJsonPath}.`);
    }
    return name;
}

function getCauseMessages(error: unknown): string[] {
    const causes: string[] = [];
    // eslint-disable-next-line no-constant-condition
    while (1) {
        const cause = (error as Error)?.cause;
        if (!cause) {
            break;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const message = (cause as any).message;
        if (!message || typeof message !== "string") {
            break;
        }

        causes.push(message);
        error = cause;
    }
    return causes;
}
