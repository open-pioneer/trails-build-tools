// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { PluginContext } from "rolldown";

/**
 * Needs to be passed to functions that load package / app metadata.
 * This is a simplified version of Rolldown's context.
 */
export interface MetadataContext {
    addWatchFile(file: string): void;
    resolveLocalFile(
        moduleId: string,
        packageName: string,
        packageDirectory: string
    ): Promise<string | undefined>;
    warn(message: string): void;
}

export function createMetadataContextFromRolldown(ctx: PluginContext): MetadataContext {
    return {
        addWatchFile: (id) => {
            ctx.addWatchFile(id);
        },
        resolveLocalFile: async (moduleId, _packageName, packageDirectory) => {
            const importer = `${packageDirectory}/package.json`;
            const result = await ctx.resolve(moduleId, importer, {
                skipSelf: true
            });
            return result?.id;
        },
        warn: (message) => {
            ctx.warn(message);
        }
    };
}
