// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { RuntimeSupport } from "@open-pioneer/build-common";
import { dataToEsm } from "@rollup/pluginutils";
import { Plugin } from "rollup";
import { isInDirectory } from "../utils/pathUtils";

export interface VirtualModulesPluginOptions {
    packageName: string;
    packageDirectory: string;
}

const REACT_HOOKS_ID = "\0virtual-pioneer-module:react-hooks";
const SOURCE_INFO_ID = "\0virtual-pioneer-module:source-info";

/**
 * Generates the virtual module `open-pioneer:react-hooks` at compile time.
 * "magic" imports should not be left standing in distributed javascript if possible
 * to avoid confusion.
 */
export function virtualModulesPlugin({
    packageName,
    packageDirectory
}: VirtualModulesPluginOptions): Plugin {
    return {
        name: "virtual-modules",
        resolveId(source, importer) {
            const virtualModuleType = RuntimeSupport.parseVirtualModule(source);
            if (!virtualModuleType) {
                return undefined; // not responsible
            }

            if (
                !importer ||
                !isInDirectory(importer, packageDirectory) ||
                /[/\\]node_modules[/\\]/.test(importer)
            ) {
                this.error({
                    id: importer,
                    message: `Unexpected import to virtual module '${source}' from a file outside the current package's directory.`
                });
            }

            importer = assertDefined(importer);

            switch (virtualModuleType) {
                case "react-hooks":
                    return REACT_HOOKS_ID;
                case "source-info": {
                    return `${SOURCE_INFO_ID}?importer=${encodeURIComponent(importer)}`;
                }
                default:
                    this.error({
                        id: importer,
                        message: `The virtual module '${source}' is currently not supported under separate compilation.`
                    });
            }
        },
        load(id) {
            if (id === REACT_HOOKS_ID) {
                return RuntimeSupport.generateReactHooks(packageName);
            }
            if (id.startsWith(SOURCE_INFO_ID)) {
                const encodedModulePath = id.split(`${SOURCE_INFO_ID}?importer=`)[1] || "";
                const modulePath = decodeURIComponent(encodedModulePath).replace(/[?#].*$/, "");
                return loadSourceInfo(packageName, packageDirectory, modulePath);
            }
            return undefined;
        }
    };
}

async function loadSourceInfo(packageName: string, packageDirectory: string, modulePath: string) {
    const sourceId = await RuntimeSupport.generateSourceId(
        packageName,
        packageDirectory,
        modulePath
    );
    const sourceInfo = {
        sourceId
    };
    return {
        code: dataToEsm(sourceInfo, {
            compact: false,
            namedExports: true,
            preferConst: true,
            objectShorthand: true
        })
    };
}

function assertDefined<T>(value: T | undefined | null): T {
    if (value == null) {
        throw new Error("Value is required but was undefined or null.");
    }
    return value;
}
