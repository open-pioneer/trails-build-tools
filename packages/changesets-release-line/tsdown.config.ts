/* oxlint-disable @tony.ganchev/header/header */

import { defineLibraryConfig } from "shared-configs/tsdown";

// This package is only ever loaded by `@changesets/cli` through the changesets config,
// so it does not ship type declarations.
export default defineLibraryConfig({ dts: false });
