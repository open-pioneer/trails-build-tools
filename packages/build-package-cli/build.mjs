// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { build } from "build-tools/support/build.js";

const mode = process.argv[2];
build(mode).catch((e) => {
    console.error(e);
    process.exit(1);
});