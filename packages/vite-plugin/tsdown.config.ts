// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { defineLibraryConfig } from "shared-configs/tsdown";

export default defineLibraryConfig({
    exports: {
        // `client.d.ts` declares the ambient `open-pioneer:*` modules. It is hand written (it
        // cannot be generated from the source) and is pulled in by applications via
        // `/// <reference types="@open-pioneer/vite-plugin-pioneer/client" />`.
        customExports: {
            "./client": "./client.d.ts"
        }
    }
});
