// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        exclude: ["**/dist/**", "**/test-data/**", "**/temp/**", "**/node_modules/**"],
        watchExclude: [
            "**/node_modules/**", "**/dist/**", "**/temp/**",
        ]
    }
});
