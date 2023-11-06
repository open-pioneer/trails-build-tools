// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { isAbsolute } from "path";
import { Plugin, PluginContext } from "rollup";

export interface CheckImportsOptions {
    packageJson: Record<string, unknown>;
    packageJsonPath: string;
    strict: boolean;
}

export function checkImportsPlugin({
    packageJson,
    packageJsonPath,
    strict
}: CheckImportsOptions): Plugin {
    const seen = new Set<string>();
    let hasErrors = false;
    const checkDependency = (
        ctx: PluginContext,
        importer: string | undefined,
        resolvedModuleId: string
    ) => {
        let packageName;
        try {
            packageName = parsePackageName(resolvedModuleId);
        } catch (e) {
            ctx.error({
                id: importer,
                message: `Failed to parse package name from imported module ${resolvedModuleId}`,
                cause: e
            });
        }
        if (!packageName) {
            return;
        }

        if (seen.has(packageName)) {
            return;
        }

        seen.add(packageName);
        if (!isDeclaredDependency(packageName, packageJson)) {
            hasErrors = true;
            ctx.warn({
                message:
                    `Failed to import '${resolvedModuleId}', the package '${packageName}' must` +
                    ` be configured either as a dependency or as a peerDependency in ${packageJsonPath}`,
                id: importer
            });
        }
    };

    return {
        name: "check-imports",
        buildStart() {
            seen.clear();
            hasErrors = false;
        },
        buildEnd() {
            if (strict && hasErrors) {
                this.error({
                    message: "Aborting due to dependency problems (strict validation is enabled)."
                });
            }
        },
        async resolveId(source, importer, options) {
            const result = await this.resolve(source, importer, { ...options, skipSelf: true });
            // Only validate imports that are external and that do not look like fully resolved absolute paths.
            if (result?.external && !isAbsolute(result.id)) {
                checkDependency(this, importer, result.id);
            }
            return result;
        }
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isDeclaredDependency(packageName: string, packageJson: Record<string, any>): boolean {
    return (
        packageJson?.dependencies?.[packageName] ||
        packageJson?.peerDependencies?.[packageName] ||
        false
    );
}

function parsePackageName(absoluteId: string): string | undefined {
    // NOTE: \0 (zero byte) is ignored because it is usually used internally in rollup
    // for plugin-generated virtual modules.
    if (absoluteId.includes("\0")) {
        return undefined;
    }

    let match: string | null | undefined;
    if (absoluteId.startsWith("@")) {
        match = absoluteId.match(/^@[^/]+\/[^/]+/)?.[0];
    } else {
        match = absoluteId.match(/^[^/]+/)?.[0];
    }

    if (!match) {
        throw new Error(`Invalid import id: '${absoluteId}'`);
    }
    return match;
}
