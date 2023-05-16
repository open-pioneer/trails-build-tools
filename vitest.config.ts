// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        exclude: ["**/dist/**", "**/test-data/**", "**/node_modules/**"]
    }
});