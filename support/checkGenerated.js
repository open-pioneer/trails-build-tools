// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { spawnSync } from "node:child_process";
import { exit } from "node:process";

// Checks that the build did not change any `package.json`.
const { status } = spawnSync("git", ["diff", "--exit-code", "--", "*package.json"], {
    stdio: "inherit"
});

// `git diff --exit-code` reports differences as exit code 1
if (status === 1) {
    console.error(
        "\nThe build regenerated fields in package.json (see the diff above).\n" +
            "Review the changes and include them in your commit."
    );
}

exit(status ?? 1);
