/* eslint-disable header/header */

/*
    Based on code from https://github.com/changesets/changesets
*/
import * as git from "@changesets/git";
import { getPackages } from "@manypkg/get-packages";
import { log } from "@changesets/logger";

export async function run(dir: string) {
    const { packages, tool } = await getPackages(dir);
    const allExistingTags = await git.getAllTags(dir);

    for (const pkg of packages) {
        if (pkg.packageJson.private) {
            log(`Skipping private package: ${pkg.packageJson.name}`);
            continue;
        }

        if (!pkg.packageJson.version) {
            log(`Skipping package without version: ${pkg.packageJson.name}`);
            continue;
        }

        const tag =
            tool.type !== "root"
                ? `${pkg.packageJson.name}@${pkg.packageJson.version}`
                : `v${pkg.packageJson.version}`;

        if (allExistingTags.has(tag)) {
            log("Skipping tag (already exists): ", tag);
        } else {
            log("New tag: ", tag);
            await git.tag(tag, dir);
        }
    }
}
