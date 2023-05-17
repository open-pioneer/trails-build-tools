// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { basename } from "node:path";

/** A normalized entry point, parsed from the build config file. */
export interface NormalizedEntryPoint {
    /**
     * The output module name in the built package, _not including_ the extension.
     *
     * Examples: `"index"`, `"foo/bar/baz"`
     */
    outputModuleId: string;

    /**
     * Path to the input module of the entry point.
     * This is always a relative path, e.g. `"./index"` or `"./foo/bar/baz.jsx"`.
     */
    inputModulePath: string;
}

/**
 * Normalizes the entry points configured by the user.
 *
 * NOTE: Does not check whether any of the specified files actually exist.
 */
export function normalizeEntryPoints(entryPoints: string[], supportedExtensions: string[]) {
    const extLookup = new Set(supportedExtensions);
    const outputLookup = new Set();
    const result: NormalizedEntryPoint[] = [];
    for (const ep of entryPoints) {
        const explicitExtension = getExtension(ep);
        if (explicitExtension && !extLookup.has(explicitExtension)) {
            throw new Error(
                `The extension '${explicitExtension}' is not supported (entry point '${ep}').`
            );
        }

        let outputModuleId = ep.replace(/^.\//, "");
        if (explicitExtension) {
            outputModuleId = outputModuleId.slice(0, -explicitExtension.length);
        }
        if (!outputModuleId.match(/^[A-Za-z0-9]/)) {
            throw new Error(
                `Entry point '${outputModuleId}' does not appear like a valid module id.`
            );
        }

        let inputModulePath = ep;
        if (!inputModulePath.startsWith("./")) {
            inputModulePath = `./${ep}`;
        }

        if (outputLookup.has(outputModuleId)) {
            throw new Error(`Entry point '${outputModuleId}' is specified twice.`);
        }
        outputLookup.add(outputModuleId);

        result.push({
            outputModuleId,
            inputModulePath
        });
    }
    return result;
}

/**
 * Returns the extension of the given path, starting from (and including) the first `.` in the file's name.
 */
export function getExtension(path: string) {
    const filename = basename(path);
    return filename.match(/^.*?(\..*)?$/)?.[1] ?? "";
}
