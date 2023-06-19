// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0

const APP_MODULE = "\0open-pioneer-app";
const APP_MODULE_RE = /\0open-pioneer-app(?:$|\?)/;

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

const PKG_RE = /[?&]pkg=(?<pkg>.*?)(?:$|&)/;
const PKG_QUERY = "pkg";

const PACKAGE_HOOKS_MODULE = "\0open-pioneer-react-hooks";
const PACKAGE_HOOKS_RE = /\0open-pioneer-react-hooks(?:$|\?)/;

export type VirtualModule = VirtualAppModule | VirtualI18nMessages | VirtualPackageModule;

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

/**
 * Takes a module id as input and parses it.
 * If this plugin is not responsible to load the module id, this function returns `undefined`.
 *
 * Otherwise, the module is parsed into an object and returned.
 */
export function parseVirtualModuleId(inputModuleId: string): VirtualModule | undefined {
    if (APP_MODULE_RE.test(inputModuleId)) {
        return parseAppModuleId(inputModuleId);
    }

    if (PACKAGE_HOOKS_RE.test(inputModuleId)) {
        const packageDirectory = getPackageDirectory(inputModuleId);
        return {
            type: "package-hooks",
            packageDirectory
        };
    }
    return undefined;
}

function parseAppModuleId(moduleId: string): VirtualModule | undefined {
    const packageDirectory = getPackageDirectory(moduleId);
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
            return `${PACKAGE_HOOKS_MODULE}?${PKG_QUERY}=${mod.packageDirectory}`;
        case "app-meta":
            return `${APP_MODULE}?${APP_META_QUERY}&${PKG_QUERY}=${mod.packageDirectory}`;
        case "app-packages":
            return `${APP_MODULE}?${APP_PACKAGES_QUERY}&${PKG_QUERY}=${mod.packageDirectory}`;
        case "app-css":
            return `${APP_MODULE}?${APP_CSS_QUERY}&${PKG_QUERY}=${mod.packageDirectory}`;
        case "app-i18n-index":
            return `${APP_MODULE}?${APP_I18N_INDEX_QUERY}&${PKG_QUERY}=${mod.packageDirectory}`;
        case "app-i18n":
            return `${APP_MODULE}?${APP_I18N_QUERY}&locale=${mod.locale}&${PKG_QUERY}=${mod.packageDirectory}`;
    }
}

function getPackageDirectory(moduleId: string) {
    const { pkg } = moduleId.match(PKG_RE)?.groups ?? {};
    if (!pkg) {
        throw new Error(`Internal error: failed to parse package directory from '${moduleId}'`);
    }
    return pkg;
}
