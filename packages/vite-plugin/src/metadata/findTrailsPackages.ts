// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { realpath } from "fs/promises";
import { ResolverFactory } from "oxc-resolver";
import { dirname, posix } from "path";
import { glob } from "tinyglobby";
import { createDebugger } from "../utils/debug";
import { MetadataContext } from "./Context";
import { PackageMetadata } from "./Metadata";
import { loadPackageMetadata } from "./loadPackageMetadata";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:metadata");

export async function findTrailsPackages(sourceRoot: string): Promise<PackageMetadata[]> {
    const ctx = createDummyContext();
    const packageResolver = ResolverFactory.default();

    const localPackageJsonFiles = await glob("**/package.json", {
        cwd: sourceRoot,
        absolute: true,
        ignore: ["**/node_modules/**"]
    });

    const seen = new Set();
    const workQueue: string[] = [];

    // packageDirectory must be a fully resolved, absolute path.
    const visit = (packageDirectory: string) => {
        if (seen.has(packageDirectory)) {
            return;
        }

        seen.add(packageDirectory);
        workQueue.push(packageDirectory);
    };
    for (const file of localPackageJsonFiles) {
        visit(dirname(file));
    }

    const trailsPackages: PackageMetadata[] = [];
    while (workQueue.length) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const packageDirectory = workQueue.pop()!;
        const pkg = await loadPackageMetadata(ctx, packageDirectory, {
            sourceRoot,
            importedFrom: undefined,
            allowMissingBuildConfigInLocalPackage: true
        });
        if (pkg.type === "plain") {
            continue;
        }

        trailsPackages.push(pkg);
        for (const dependency of pkg.dependencies) {
            const depResult = await packageResolver.async(
                packageDirectory,
                dependency.packageName + "/package.json"
            );
            if (depResult.path) {
                const depPath = await realpath(dirname(depResult.path));
                visit(depPath);
            }
        }
    }
    trailsPackages.sort((p1, p2) => p1.name.localeCompare(p2.name, "en"));
    return trailsPackages;
}

function createDummyContext(): MetadataContext {
    return {
        addWatchFile(_file) {},
        async resolveLocalFile(moduleId, _packageDir, packageName) {
            return posix.join(packageName, moduleId);
        },
        warn(message) {
            isDebug && debug("Problem during trails package discovery: %s", message);
        }
    };
}
