// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

/*
    Based on code from https://github.com/changesets/changesets

    Original license:

        MIT License

        Copyright (c) 2019 Ben Conolly

        Permission is hereby granted, free of charge, to any person obtaining a copy
        of this software and associated documentation files (the "Software"), to deal
        in the Software without restriction, including without limitation the rights
        to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
        copies of the Software, and to permit persons to whom the Software is
        furnished to do so, subject to the following conditions:

        The above copyright notice and this permission notice shall be included in all
        copies or substantial portions of the Software.

        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
        IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
        AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
        LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
        OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
        SOFTWARE.
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
