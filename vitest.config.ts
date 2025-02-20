// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from "vitest/config";

const IGNORED_FILES = ["**/dist/**", "**/test-data/**", "**/temp/**", "**/node_modules/**"];

export default defineConfig({
    test: {
        exclude: IGNORED_FILES
    },
    server: {
        watch: {
            ignored: IGNORED_FILES
        }
    }
});
