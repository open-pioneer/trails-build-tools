// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { Plugin } from "rollup";
import { isInDirectory } from "../utils/pathUtils";
import { RuntimeSupport } from "@open-pioneer/build-common";

export interface VirtualModulesPluginOptions {
    packageName: string;
    packageDirectory: string;
}

const REACT_HOOKS_ID = "\0virtual-pioneer-module:react-hooks";

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

            switch (virtualModuleType) {
                case "react-hooks":
                    return REACT_HOOKS_ID;
                default:
                    this.error({
                        id: importer,
                        message: `The virtual module '${source}' is currently not supported under separate compilation.`
                    });
            }
        },
        load(id) {
            if (id !== REACT_HOOKS_ID) {
                return undefined;
            }
            return RuntimeSupport.generateReactHooks(packageName);
        }
    };
}
