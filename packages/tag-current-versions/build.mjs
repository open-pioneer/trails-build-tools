// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { build } from "build-tools/support/build.js";

const mode = process.argv[2];
build(mode).catch((e) => {
    console.error(e);
    process.exit(1);
});
