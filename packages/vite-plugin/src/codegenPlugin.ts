// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { normalizePath, Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { createDebugger } from "./utils/debug";
import { generatePackagesMetadata } from "./codegen/generatePackagesMetadata";
import { MetadataRepository } from "./metadata/MetadataRepository";
import { generateCombinedCss } from "./codegen/generateCombinedCss";
import { generateAppMetadata } from "./codegen/generateAppMetadata";
import { parseVirtualModuleId, serializeModuleId } from "./codegen/shared";
import { readFile } from "node:fs/promises";
import { ReportableError } from "./ReportableError";
import { generateI18nIndex, generateI18nMessages } from "./codegen/generateI18n";
import { RuntimeSupport } from "@open-pioneer/build-common";
import { PluginContext } from "rolldown";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:codegen");

export function codegenPlugin(): Plugin {
    let config!: ResolvedConfig;
    let repository!: MetadataRepository;
    let devServer: ViteDevServer | undefined;

    return {
        name: "pioneer:codegen",

        async buildStart(this: PluginContext) {
            repository?.reset();
        },

        configResolved(resolvedConfig) {
            config = resolvedConfig;
            repository = new MetadataRepository(config.root);
        },

        configureServer(server) {
            devServer = server;
        },

        resolveId: {
            filter: {
                id: [/^open-pioneer:/, /[?&]open-pioneer/, /@@open-pioneer/]
            },
            async handler(this: PluginContext, moduleId, importer) {
                try {
                    if (!importer) {
                        return undefined;
                    }

                    if (parseVirtualModuleId(moduleId)) {
                        return moduleId;
                    }

                    const getPackageDirectory = () => {
                        const packageJsonPath = findPackageJson(dirname(importer), config.root);
                        if (!packageJsonPath) {
                            throw new ReportableError(
                                `Failed to find package.json for package from '${importer}'.`
                            );
                        }

                        const packageDir = dirname(packageJsonPath);
                        return normalizePath(packageDir);
                    };

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
                                packageDirectory: getPackageDirectory()
                            });
                        case "react-hooks":
                            return serializeModuleId({
                                type: "package-hooks",
                                packageDirectory: getPackageDirectory()
                            });
                    }
                } catch (e) {
                    reportError(this, e, !!devServer);
                }
            }
        },

        load: {
            filter: {
                id: [/^open-pioneer:/, /[?&]open-pioneer/, /@@open-pioneer/]
            },
            async handler(this: PluginContext, moduleId) {
                try {
                    const mod = parseVirtualModuleId(moduleId);
                    if (!mod) {
                        return undefined;
                    }

                    isDebug && debug("Loading virtual module %O", mod);

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

                    const appMetadata = await repository.getAppMetadata(
                        this,
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
                                    return repository.getI18nFile(this, path);
                                }
                            });
                            isDebug && debug("Generated i18n messages: %O", generatedSourceCode);
                            return generatedSourceCode;
                        }
                    }
                } catch (e) {
                    reportError(this, e, !!devServer);
                }
            }
        },

        watchChange(id, _change) {
            isDebug && debug("File %s changed", id);
            repository.onFileChanged(id);
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

function findPackageJson(startDir: string, rootDir: string) {
    let dir = startDir;
    while (dir) {
        const candidate = join(dir, "package.json");
        if (existsSync(candidate)) {
            return candidate;
        }

        if (normalizePath(dir) == normalizePath(rootDir)) {
            return undefined;
        }

        const parent = dirname(dir);
        dir = parent === dir || parent === "." ? "" : parent;
    }
    return undefined;
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
