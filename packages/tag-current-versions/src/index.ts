// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { cwd, exit } from "node:process";
import { run } from "./run";

run(cwd()).catch((e) => {
    console.error("Fatal error", e);
    exit(1);
});
