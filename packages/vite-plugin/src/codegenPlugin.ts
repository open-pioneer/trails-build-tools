// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { RuntimeSupport } from "@open-pioneer/build-common";
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { cwd } from "node:process";
import { normalizePath, Rolldown, UserConfig, Plugin as VitePlugin } from "vite";
import { ReportableError } from "./ReportableError";
import { generateAppMetadata } from "./codegen/generateAppMetadata";
import { generateCombinedCss } from "./codegen/generateCombinedCss";
import { generateI18nIndex, generateI18nMessages } from "./codegen/generateI18n";
import { generatePackagesMetadata } from "./codegen/generatePackagesMetadata";
import {
    findPackageJson,
    parseVirtualModuleId,
    serializeModuleId,
    VIRTUAL_ID_FILTER
} from "./codegen/shared";
import { DeploymentModule } from "./deployment";
import { MetadataRepository } from "./metadata/MetadataRepository";
import { findTrailsPackages } from "./metadata/findTrailsPackages";
import { createDebugger } from "./utils/debug";
import { createMetadataContextFromRolldown } from "./metadata/Context";

type PluginContext = Rolldown.PluginContext;

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
                return await configureDevOptimizer(userConfig, rootDir);
            }
        },

        configResolved(config) {
            deploymentModule = new DeploymentModule(isDev, config.base);
        },

        async buildStart(this: PluginContext) {
            repository?.reset();
            deploymentModule.onStart(this);
        },

        resolveId: {
            filter: {
                id: VIRTUAL_ID_FILTER
            },
            async handler(this: PluginContext, moduleId, importer) {
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
                        case "deployment": {
                            return serializeModuleId({
                                type: "deployment"
                            });
                        }
                    }
                } catch (e) {
                    reportError(this, e, isDev);
                }
            }
        },

        load: {
            filter: {
                id: VIRTUAL_ID_FILTER
            },
            async handler(this: PluginContext, moduleId) {
                try {
                    const mod = parseVirtualModuleId(moduleId);
                    if (!mod) {
                        return undefined;
                    }

                    isDebug && debug("Loading virtual module %O", mod);

                    if (mod.type === "deployment") {
                        return deploymentModule.onLoadModule();
                    }

                    // During development we will observe directories like "/packages/foo" (i.e. not fully resolved).
                    // This uses the dev server to attempt to resolve the directory back to a complete path.
                    // Hit me up if you know a better way to do this.
                    const packageJsonPath = (
                        await this.resolve(mod.packageDirectory + "/package.json")
                    )?.id;
                    if (!packageJsonPath) {
                        throw new ReportableError(
                            `Failed to resolve package.json in ${mod.packageDirectory}`
                        );
                    }

                    if (mod.type === "source-info") {
                        const packageName = await getPackageName(this, packageJsonPath);
                        return RuntimeSupport.generateSourceInfo(packageName, mod.modulePath);
                    }
                    if (mod.type === "package-hooks") {
                        const directory = mod.packageDirectory;
                        // use forward slashes instead of platform separator
                        const packageJsonPath = (await this.resolve(directory + "/package.json"))
                            ?.id;
                        if (!packageJsonPath) {
                            throw new ReportableError(
                                `Failed to resolve package.json in ${directory}`
                            );
                        }

                        const packageName = await getPackageName(this, packageJsonPath);
                        const generatedSourceCode = RuntimeSupport.generateReactHooks(
                            packageName,
                            RuntimeSupport.REACT_INTEGRATION_MODULE_ID
                        );
                        isDebug && debug("Generated hooks code: %O", generatedSourceCode);
                        return generatedSourceCode;
                    }

                    if (mod.type === "app-meta") {
                        return generateAppMetadata(
                            mod.packageDirectory,
                            RuntimeSupport.METADATA_MODULE_ID
                        );
                    }

                    const ctx = createMetadataContextFromRolldown(this);
                    const appMetadata = await repository.getAppMetadata(
                        ctx,
                        dirname(packageJsonPath)
                    );
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
                        default:
                            assertNever(mod.type);
                    }
                } catch (e) {
                    reportError(this, e, isDev);
                }
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

async function configureDevOptimizer(
    userConfig: UserConfig,
    rootDir: string
): Promise<Omit<UserConfig, "plugins">> {
    const trailsModules = await getOptimizeDepsIncludes(rootDir);
    return {
        optimizeDeps: {
            include: trailsModules,
            rolldownOptions: {
                plugins: [createOptimizeDepsRolldownPlugin()]
            }
        }
    };
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
 * Creates a rolldown plugin for use during Vite's dependency optimization phase.
 * It marks all `open-pioneer:*` virtual module imports as external so that they
 * are left untouched by rolldown and can later be handled by the normal Vite plugin.
 */
function createOptimizeDepsRolldownPlugin(): Rolldown.Plugin {
    return {
        name: "pioneer:optimize-deps",
        resolveId(id) {
            if (/^open-pioneer:/.test(id)) {
                return { id, external: true };
            }
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

function assertNever(x: never): never {
    throw new Error("Should not be reached: " + x);
}
