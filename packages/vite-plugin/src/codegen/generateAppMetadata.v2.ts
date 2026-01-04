// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { serializeModuleId } from "./shared";
import { RuntimeVersion } from "@open-pioneer/build-common";

/**
 * Generates the main app metadata module in version 2.0.0.
 * It delegates the actual metadata generation to auxiliary modules.
 */
export function generateAppMetadataV2(
    packageDirectory: string,
    metadataModuleId: string,
    runtimeVersion: RuntimeVersion
) {
    const packagesModule = serializeModuleId({ type: "app-packages", packageDirectory });
    const cssModule =
        serializeModuleId({ type: "app-css", packageDirectory }) + "&inline&lang.scss";
    const i18nModule = serializeModuleId({ type: "app-i18n-index", packageDirectory });
    return `
import { createBox } from ${JSON.stringify(metadataModuleId)};
import packages from ${JSON.stringify(packagesModule)};
import stylesString from ${JSON.stringify(cssModule)};
import { locales, loadMessages as loadMessagesFn } from ${JSON.stringify(i18nModule)};

const styles = createBox(stylesString);
const loadMessages = createBox(loadMessagesFn);
const runtimeVersion = ${JSON.stringify(runtimeVersion)};

if (import.meta.hot) {
    import.meta.hot.data.styles ??= styles;
    import.meta.hot.data.loadMessages ??= loadMessages;
    
    import.meta.hot.accept((mod) => {
        function arrayEq(a, b) {
            if (a === b) {
                return true;
            }
            if (!a || !b) {
                return false;
            }
            return a.length === b.length && a.every((v, i) => v === b[i]);
        }

        if (!mod || mod.packages !== packages || !arrayEq(mod.locales, locales)) {
            // Cannot handle these changes, trigger reload:
            import.meta.hot.invalidate();
            return;
        }

        if (mod.styles.value !== styles.value) {
            import.meta.hot.data.styles.setValue(mod.styles.value);
        }
        if (mod.loadMessages.value !== loadMessages.value) {
            import.meta.hot.data.loadMessages.setValue(mod.loadMessages.value);
        }
    });
}

export {
    packages,
    styles,
    locales,
    loadMessages,
    runtimeVersion
};
`.trim();
}
