// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "fs";
import { basename, dirname } from "node:path/posix";
import { join } from "path/posix";
import { normalizePath } from "vite";

const APP_MODULE = "@@open-pioneer-app";

const APP_META_QUERY = "open-pioneer-app";
const APP_META_RE = /[?&]open-pioneer-app(?:$|&)/;

const APP_PACKAGES_QUERY = "open-pioneer-packages";
const APP_PACKAGES_RE = /[?&]open-pioneer-packages(?:$|&)/;

const APP_CSS_QUERY = "open-pioneer-styles";
const APP_CSS_RE = /[?&]open-pioneer-styles(?:$|&)/;

const APP_I18N_INDEX_QUERY = "open-pioneer-i18n-index";
const APP_I18N_INDEX_RE = /[?&]open-pioneer-i18n-index(?:$|&)/;

const APP_I18N_QUERY = "open-pioneer-i18n";
const APP_I18N_RE = /[?&]open-pioneer-i18n(?:$|&)/;
const APP_I18N_LOCALE_RE = /[?&]locale=(?<locale>.*?)(?:$|&)/;

const PACKAGE_HOOKS_MODULE = "@@open-pioneer-react-hooks";

const SOURCE_INFO_MODULE = "@@open-pioneer-source-info";
const SOURCE_INFO_MODULE_IMPORTER_RE = /@@open-pioneer-source-info&importer=(?<importer>.*)$/;

const SOURCE_FILE_RE = /^(.*?)(?:\?|$)/;

export type VirtualModule =
    | VirtualAppModule
    | VirtualI18nMessages
    | VirtualPackageModule
    | VirtualSourceInfoModule;

export interface VirtualAppModule {
    type: "app-meta" | "app-packages" | "app-css" | "app-i18n-index";
    packageDirectory: string;
}

export interface VirtualI18nMessages {
    type: "app-i18n";
    packageDirectory: string;
    locale: string;
}

export interface VirtualPackageModule {
    type: "package-hooks";
    packageDirectory: string;
}

export interface VirtualSourceInfoModule {
    type: "source-info";
    importer: string;
    packageDirectory: string;
}

/**
 * Takes a module id as input and parses it.
 * If this plugin is not responsible to load the module id, this function returns `undefined`.
 *
 * Otherwise, the module is parsed into an object and returned.
 */
export function parseVirtualModuleId(inputModuleId: string): VirtualModule | undefined {
    const moduleId = normalizePath(inputModuleId);
    if (!moduleId || moduleId.includes("\\0")) {
        return undefined;
    }

    const sourceFile = getSourceFile(moduleId); // module id with out query
    if (!sourceFile) {
        return undefined;
    }

    const base = basename(sourceFile);
    if (base === PACKAGE_HOOKS_MODULE) {
        return {
            type: "package-hooks",
            packageDirectory: dirname(sourceFile)
        };
    }

    const sourceInfoMatch = moduleId.match(SOURCE_INFO_MODULE_IMPORTER_RE);
    if (sourceInfoMatch) {
        return parseSourceInfoModule(moduleId, sourceInfoMatch);
    }

    if (base === APP_MODULE) {
        return parseAppModuleId(sourceFile, moduleId);
    }
    return undefined;
}

function parseSourceInfoModule(moduleId: string, sourceInfoMatch: RegExpMatchArray): VirtualModule {
    const encodedImporterPath = sourceInfoMatch?.groups?.["importer"];
    const importer = encodedImporterPath
        ? getSourceFile(decodeURIComponent(encodedImporterPath))
        : undefined;
    if (!importer) {
        throw new Error(`Missing importer in source info module id: ${moduleId}`);
    }
    const moduleRoot = moduleId.substring(0, moduleId.indexOf(`${SOURCE_INFO_MODULE}`));
    if (!moduleRoot) {
        throw new Error(
            `Cannot determine module root directory for source info module id: ${moduleId}`
        );
    }
    const packageJsonPath = findPackageJson(dirname(importer), moduleRoot);
    if (!packageJsonPath) {
        throw new Error(`Cannot determine package.json for source info module id: ${moduleId}`);
    }
    const packageDirectory = dirname(packageJsonPath);
    return { type: "source-info", importer, packageDirectory };
}

function parseAppModuleId(sourceFile: string, moduleId: string): VirtualModule | undefined {
    const packageDirectory = dirname(sourceFile);
    if (moduleId.match(APP_META_RE)) {
        const type = "app-meta";
        return { type, packageDirectory };
    } else if (moduleId.match(APP_PACKAGES_RE)) {
        const type = "app-packages";
        return { type, packageDirectory };
    } else if (moduleId.match(APP_CSS_RE)) {
        // TODO: Workaround. Vite will also request source maps for the inline css
        // which we can't really serve right now because the importer is wrong (index.html instead of the app directory).
        if (moduleId.endsWith(".map")) {
            return undefined;
        }

        const type = "app-css";
        return { type, packageDirectory };
    } else if (moduleId.match(APP_I18N_INDEX_RE)) {
        const type = "app-i18n-index";
        return { type, packageDirectory };
    } else if (moduleId.match(APP_I18N_RE)) {
        const type = "app-i18n";
        const locale = moduleId.match(APP_I18N_LOCALE_RE)?.groups?.["locale"];
        if (!locale) {
            throw new Error("Missing locale name in i18n module request");
        }
        return { type, packageDirectory, locale };
    }
    throw new Error(`Unexpected module id: ${moduleId}`);
}

/**
 * Serializes the given virtual module descriptor into a module id string.
 */
export function serializeModuleId(mod: VirtualModule): string {
    switch (mod.type) {
        case "package-hooks":
            return `${mod.packageDirectory}/${PACKAGE_HOOKS_MODULE}`;
        case "source-info":
            return `${mod.packageDirectory}/${SOURCE_INFO_MODULE}&importer=${encodeURIComponent(mod.importer)}`;
        case "app-meta":
            return `${mod.packageDirectory}/${APP_MODULE}?${APP_META_QUERY}`;
        case "app-packages":
            return `${mod.packageDirectory}/${APP_MODULE}?${APP_PACKAGES_QUERY}`;
        case "app-css":
            return `${mod.packageDirectory}/${APP_MODULE}?${APP_CSS_QUERY}`;
        case "app-i18n-index":
            return `${mod.packageDirectory}/${APP_MODULE}?${APP_I18N_INDEX_QUERY}`;
        case "app-i18n":
            return `${mod.packageDirectory}/${APP_MODULE}?${APP_I18N_QUERY}&locale=${mod.locale}`;
    }
}

function getSourceFile(moduleId: string) {
    const sourceFile = moduleId.match(SOURCE_FILE_RE)?.[1];
    if (!sourceFile || moduleId[0] == "\0") {
        return undefined;
    }
    return sourceFile;
}

export function findPackageJson(startDir: string, rootDir: string) {
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
