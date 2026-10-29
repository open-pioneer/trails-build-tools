// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { cwd } from "node:process";
import { RuntimeSupport } from "@open-pioneer/build-common";
import { normalizePath, Rolldown, UserConfig, Plugin as VitePlugin } from "vite";
import { generateAppMetadata } from "./codegen/generateAppMetadata";
import { generateCombinedCss } from "./codegen/generateCombinedCss";
import { generateI18nIndex, generateI18nMessages } from "./codegen/generateI18n";
import { generatePackagesMetadata } from "./codegen/generatePackagesMetadata";
import { generateTestSupport } from "./codegen/generateTestSupport";
import {
    findPackageJson,
    MAGIC_FILENAME_RE,
    parseVirtualModuleId,
    serializeModuleId,
    VIRTUAL_ID_FILTER
} from "./codegen/shared";
import { DeploymentModule } from "./deployment";
import { createMetadataContextFromRolldown, MetadataContext } from "./metadata/Context";
import { findTrailsPackages } from "./metadata/findTrailsPackages";
import { MetadataRepository } from "./metadata/MetadataRepository";
import { validateI18nConfig } from "./metadata/validateI18nConfig";
import { ReportableError } from "./ReportableError";
import { createDebugger } from "./utils/debug";
import { fileExists } from "./utils/fileUtils";

type PluginContext = Rolldown.PluginContext;
type SourceDescription = Rolldown.SourceDescription;

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:codegen");

/**
 * The subset of the context that vitest passes to a plugin's `configureVitest` hook.
 * Declared here because the plugin has no dependency on vitest.
 */
interface VitestPluginContext {
    defineCacheKeyGenerator(
        generator: (context: { id: string }) => string | undefined | null | false
    ): void;
}

export function codegenPlugin(): VitePlugin & {
    configureVitest(context: VitestPluginContext): void;
} {
    let isDev!: boolean;
    let isTestRun!: boolean;
    let rootDir!: string;
    let resolvedRoot!: string;
    let repository!: MetadataRepository;
    let deploymentModule!: DeploymentModule;

    return {
        name: "pioneer:codegen",

        async config(userConfig, env) {
            isDev = env.command === "serve";
            isTestRun = process.env.VITEST === "true";
            rootDir = userConfig.root ?? cwd();
            repository = new MetadataRepository(rootDir);

            if (isDev) {
                return await configureDevOptimizer(userConfig, rootDir);
            }
        },

        configResolved(config) {
            resolvedRoot = normalizePath(config.root);
            deploymentModule = new DeploymentModule(isDev, config.base);
        },

        configureVitest(context) {
            // Don't cache virtual modules.
            context.defineCacheKeyGenerator(({ id }) => {
                if (parseVirtualModuleId(id)) {
                    return false;
                }
                return undefined;
            });
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

                    // Vite turns ids inside the root into root-relative URLs ("/packages/x/@@open-pioneer-app?...").
                    // Vitest's fs module cache re-resolves those URLs without the importer that produced them,
                    // so map them back to the absolute id.
                    if (
                        moduleId.startsWith("/") &&
                        !moduleId.startsWith(resolvedRoot + "/") &&
                        MAGIC_FILENAME_RE.test(moduleId)
                    ) {
                        const absoluteId = resolvedRoot + moduleId;
                        if (parseVirtualModuleId(absoluteId)) {
                            return absoluteId;
                        }
                    }

                    if (parseVirtualModuleId(moduleId)) {
                        return moduleId;
                    }

                    let virtualModule;
                    try {
                        virtualModule = RuntimeSupport.parseVirtualModule(moduleId);
                    } catch (e) {
                        throw new ReportableError(
                            String((e as Error).message) || "Invalid virtual module id",
                            { cause: e }
                        );
                    }

                    if (!virtualModule) {
                        return undefined;
                    }

                    switch (virtualModule.type) {
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
                        case "test-support":
                            if (!isTestRun) {
                                throw new ReportableError(
                                    "'open-pioneer:test-support' may only be imported from tests."
                                );
                            }
                            return serializeModuleId({
                                type: "test-support",
                                packageDirectory: getPackageDirectoryFromImporter(
                                    importer,
                                    rootDir
                                ),
                                locale: virtualModule.locale
                            });
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
            async handler(this: PluginContext, moduleId): Promise<SourceDescription | undefined> {
                try {
                    const mod = parseVirtualModuleId(moduleId);
                    if (!mod) {
                        return undefined;
                    }

                    isDebug && debug("Loading virtual module %O", mod);

                    if (mod.type === "deployment") {
                        return jsModule(deploymentModule.onLoadModule());
                    }

                    const packageJsonPath = await resolvePackageJson(this, mod);
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
                        return jsModule(generatedSourceCode);
                    }
                    if (mod.type === "source-info") {
                        const packageName = await getPackageName(this, packageJsonPath);
                        return jsModule(
                            RuntimeSupport.generateSourceInfo(packageName, mod.modulePath)
                        );
                    }

                    const ctx = createMetadataContextFromRolldown(this);
                    if (mod.type === "test-support") {
                        const { rootPackage, packages } = await repository.getTestSupportMetadata(
                            ctx,
                            dirname(packageJsonPath)
                        );
                        const generatedSourceCode = await generateTestSupport({
                            rootPackage,
                            locale: mod.locale,
                            packages,
                            loadI18n: createI18nLoader(ctx, repository)
                        });
                        isDebug && debug("Generated test support: %O", generatedSourceCode);
                        return jsModule(generatedSourceCode);
                    }

                    const appMetadata = await repository.getAppMetadata(
                        ctx,
                        dirname(packageJsonPath)
                    );
                    if (mod.type === "app-meta") {
                        const runtimeVersion = appMetadata.runtimeMetadataVersion;
                        isDebug &&
                            debug("Generating app metadata for runtime version %s", runtimeVersion);
                        const generatedSourceCode = generateAppMetadata(
                            mod.packageDirectory,
                            RuntimeSupport.METADATA_MODULE_ID,
                            runtimeVersion
                        );
                        return jsModule(generatedSourceCode);
                    }

                    switch (mod.type) {
                        case "app-packages": {
                            const generatedSourceCode = generatePackagesMetadata({
                                appName: appMetadata.name,
                                packages: appMetadata.packages
                            });
                            isDebug && debug("Generated app metadata: %O", generatedSourceCode);
                            return jsModule(generatedSourceCode);
                        }
                        case "app-css": {
                            const generatedSourceCode = generateCombinedCss(appMetadata.packages);
                            isDebug && debug("Generated app css: %O", generatedSourceCode);
                            return jsModule(generatedSourceCode);
                        }
                        case "app-i18n-index": {
                            await validateI18nConfig(ctx, repository, appMetadata);
                            const generatedSourceCode = generateI18nIndex(
                                mod.packageDirectory,
                                appMetadata.locales
                            );
                            isDebug && debug("Generated i18n lookup: %O", generatedSourceCode);
                            return jsModule(generatedSourceCode);
                        }
                        case "app-i18n": {
                            const generatedSourceCode = await generateI18nMessages({
                                mode: "app",
                                locale: mod.locale,
                                appName: appMetadata.name,
                                packages: appMetadata.packages,
                                loadI18n: createI18nLoader(ctx, repository)
                            });
                            isDebug && debug("Generated i18n messages: %O", generatedSourceCode);
                            return jsModule(generatedSourceCode);
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

function createI18nLoader(ctx: MetadataContext, repository: MetadataRepository) {
    return async (_pkg: unknown, filePath: string) => {
        ctx.addWatchFile(filePath);
        if (!(await fileExists(filePath))) {
            throw new ReportableError(`I18n file at ${filePath} does not exist.`);
        }
        return repository.getI18nFile(ctx, filePath);
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
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any
        cause: (error as any).cause,
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any
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

function jsModule(code: string): SourceDescription {
    return {
        code,
        moduleType: "js"
    };
}

function getCauseMessages(error: unknown): string[] {
    const causes: string[] = [];
    // oxlint-disable-next-line no-constant-condition
    while (1) {
        const cause = (error as Error)?.cause;
        if (!cause) {
            break;
        }

        // oxlint-disable-next-line @typescript-eslint/no-explicit-any
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
