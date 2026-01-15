// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { serializeModuleId } from "./shared";
import { CURRENT_RUNTIME_VERSION } from "@open-pioneer/build-common";

/**
 * Generates the main app metadata module.
 * It delegates the actual metadata generation to auxiliary modules.
 */
export function generateAppMetadata(
    packageDirectory: string,
    metadataModuleId: string,
    runtimeVersion: string
) {
    /*
        CSS loading: 
        - 'inline' loads the (s)css as a string literal.
        - the suffix (e.g. '.scss') at the very end is important to trigger the correct vite plugin!
          using .scss supports both .css and .scss, since .css files can be imported from .scss when using vite.
        - I would like to import css as an url instead (separate file),
          but that currently hinges on https://github.com/vitejs/vite/pull/11084

        Hot reloading:
        - See https://vitejs.dev/guide/api-hmr.html for vite's HMR API
        - When a css string changes, the module exporting the `stylesString` below changes.
          We accept those changes through the `import.meta.hot.accept` mechanism by
          calling the `setValue` method on the old observable box value.
          The runtime has a reference to the box and watches for changes (only during development!)
        - The code below takes care to use the _correct_ `styles` box (every module has its own, even the new version).
          `import.meta.hot.data` is shared between all versions of the module, so we always use the first box.
    */
    const packagesModule = serializeModuleId({ type: "app-packages", packageDirectory });
    const cssModule =
        serializeModuleId({ type: "app-css", packageDirectory }) + "&inline&lang.scss";
    const i18nModule = serializeModuleId({ type: "app-i18n-index", packageDirectory });
    const currentRuntimeVersion = runtimeVersion === CURRENT_RUNTIME_VERSION;
    return `
import { createBox } from ${JSON.stringify(metadataModuleId)};
import packages from ${JSON.stringify(packagesModule)};
import stylesString from ${JSON.stringify(cssModule)};
import { locales, loadMessages as loadMessagesFn } from ${JSON.stringify(i18nModule)};

const styles = createBox(stylesString);
const loadMessages = ${JSON.stringify(currentRuntimeVersion)} ? createBox(loadMessagesFn) : loadMessagesFn ;

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

        if (!mod || mod.packages !== packages || (${JSON.stringify(currentRuntimeVersion)} && !arrayEq(mod.locales, locales))) {
            // Cannot handle these changes, trigger reload:
            import.meta.hot.invalidate();
            return;
        }

        if (mod.styles.value !== styles.value) {
            import.meta.hot.data.styles.setValue(mod.styles.value);
        }
        if (${JSON.stringify(currentRuntimeVersion)} && mod.loadMessages.value !== loadMessages.value) {
            import.meta.hot.data.loadMessages.setValue(mod.loadMessages.value);
        }
    });
}

export {
    packages,
    styles,
    locales,
    loadMessages
};
`.trim();
}
