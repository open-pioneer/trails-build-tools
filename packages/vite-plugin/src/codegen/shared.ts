// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { dirname } from "node:path";

const APP_META_RE = /[?&]open-pioneer-app(?:$|&)/;
const APP_PACKAGES_RE = /[?&]open-pioneer-packages(?:$|&)/;
const APP_CSS_RE = /[?&]open-pioneer-styles(?:$|&)/;
const APP_I18N_INDEX_RE = /[?&]open-pioneer-i18n-index(?:$|&)/;
const APP_I18N_RE = /[?&]open-pioneer-i18n(?:$|&)/;
const APP_I18N_LOCALE_RE = /[?&]locale=(?<locale>.*?)(?:$|&)/;
const APP_HOOKS_RE = /[/\\]@@open-pioneer-react-hooks(?:\?|$)/;
const SOURCE_FILE_RE = /^(.*?)(?:\?|$)/;

export const APP_META_QUERY = "open-pioneer-app";
export const APP_PACKAGES_QUERY = "open-pioneer-packages";
export const APP_CSS_QUERY = "open-pioneer-styles";
export const APP_I18N_INDEX_QUERY = "open-pioneer-i18n-index";
export const APP_I18N_QUERY = "open-pioneer-i18n";
export const PACKAGE_HOOKS = "@@open-pioneer-react-hooks";

export interface VirtualAppModule {
    type: "app-meta" | "app-packages" | "app-css" | "app-i18n-index";
    importer: string;
}

export interface VirtualI18nMessages {
    type: "app-i18n";
    importer: string;
    locale: string;
}

export interface VirtualPackageModule {
    type: "package-hooks";
    packageDirectory: string;
}

export function parseVirtualAppModuleId(
    moduleId: string
): VirtualAppModule | VirtualI18nMessages | VirtualPackageModule | undefined {
    if (moduleId.match(APP_HOOKS_RE)) {
        return {
            type: "package-hooks",
            packageDirectory: dirname(getSourceFile(moduleId))
        };
    }

    if (moduleId.match(APP_META_RE)) {
        const type = "app-meta";
        const importer = getSourceFile(moduleId);
        return { type, importer };
    } else if (moduleId.match(APP_PACKAGES_RE)) {
        const type = "app-packages";
        const importer = getSourceFile(moduleId);
        return { type, importer };
    } else if (moduleId.match(APP_CSS_RE)) {
        const type = "app-css";
        const importer = getSourceFile(moduleId);
        return { type, importer };
    } else if (moduleId.match(APP_I18N_INDEX_RE)) {
        const type = "app-i18n-index";
        const importer = getSourceFile(moduleId);
        return { type, importer };
    } else if (moduleId.match(APP_I18N_RE)) {
        const type = "app-i18n";
        const importer = getSourceFile(moduleId);
        const locale = moduleId.match(APP_I18N_LOCALE_RE)?.groups?.["locale"];
        if (!locale) {
            throw new Error("Missing locale name in i18n module request");
        }
        return { type, importer, locale };
    }
    return undefined;
}

export function appLocaleFileId(appModuleId: string, locale: string) {
    return `${appModuleId}?${APP_I18N_QUERY}&locale=${locale}`;
}

function getSourceFile(moduleId: string) {
    const sourceFile = moduleId.match(SOURCE_FILE_RE)?.[1];
    if (!sourceFile || moduleId[0] == "\0") {
        throw new Error(`Failed to get actual source file from '${moduleId}'.`);
    }
    return sourceFile;
}
