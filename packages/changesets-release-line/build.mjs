/* oxlint-disable @tony.ganchev/header/header */

import { build } from "build-tools/support/build.js";

const mode = process.argv[2];
build(mode, { format: "esm" }).catch((e) => {
    console.error(e);
    process.exit(1);
});
