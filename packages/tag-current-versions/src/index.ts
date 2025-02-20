// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { cwd, exit } from "node:process";
import { run } from "./run";

run(cwd()).catch((e) => {
    console.error("Fatal error", e);
    exit(1);
});
