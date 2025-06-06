// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { build } from "build-tools/support/build.js";

const mode = process.argv[2];
build(mode, { format: "esm" }).catch((e) => {
    console.error(e);
    process.exit(1);
});
