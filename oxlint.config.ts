// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, type OxlintConfig } from "oxlint";

export default defineConfig({
    plugins: ["typescript", "eslint", "import", "oxc", "promise", "vitest"],
    jsPlugins: ["@tony.ganchev/eslint-plugin-header"],
    categories: {
        correctness: "error",
        perf: "warn"
    },
    env: {
        builtin: true,
        node: true
    },
    ignorePatterns: [
        "**/dist",
        "**/node_modules",
        "**/temp",
        "**/test-data",
        "**/.*",
        "**/__snapshots"
        // "packages/pnpm-plugin-defaults/pnpmfile.cjs"
    ],
    options: {
        reportUnusedDisableDirectives: "error"
    },
    rules: {
        "no-array-constructor": "error",
        "no-case-declarations": "error",
        "no-empty": "error",
        "no-fallthrough": "error",
        "no-prototype-builtins": "error",
        "no-regex-spaces": "error",
        "no-unused-expressions": [
            "error",
            {
                allowShortCircuit: true,
                allowTernary: true
            }
        ],
        "no-var": "error",
        "import/no-duplicates": "error",
        "max-params": [
            "warn",
            {
                max: 4
            }
        ],
        "prefer-const": "error",
        "prefer-rest-params": "error",
        "prefer-spread": "error",
        "preserve-caught-error": "error",
        "oxc/branches-sharing-code": "warn",
        "oxc/no-accumulating-spread": "warn",
        "oxc/no-this-in-exported-function": "error",

        // Prefix vars with "_" to silence this warning.
        "no-unused-vars": [
            "warn",
            {
                vars: "all",
                varsIgnorePattern: "^_",
                caughtErrors: "all",
                caughtErrorsIgnorePattern: "^_",
                args: "after-used",
                argsIgnorePattern: "^_"
            }
        ],

        // Enforce copyright header on top of the file.
        // NOTE: use your own copyright header (if the existing does not apply) or remove this rule completely.
        "@tony.ganchev/header/header": [
            "error",
            {
                header: {
                    commentType: "line",
                    lines: [
                        " SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)",
                        " SPDX-License-Identifier: Apache-2.0"
                    ]
                },
                // Separate imports from license header
                trailingEmptyLines: {
                    minimum: 2
                }
            }
        ],

        // TypeScript rules
        "typescript/ban-ts-comment": "error",
        "typescript/no-empty-object-type": "off",
        "typescript/no-explicit-any": "error",
        "typescript/no-namespace": "error",
        "typescript/no-non-null-assertion": "error",
        "typescript/no-require-imports": "error",
        "typescript/no-unnecessary-type-constraint": "error",
        "typescript/no-unsafe-function-type": "error",
        "typescript/triple-slash-reference": "error",

        // Vitest rules
        "vitest/no-commented-out-tests": "error",
        "vitest/require-mock-type-parameters": "off"
    },
    overrides: [
        {
            // Allow non-null assertions ("!") and "as any" casts in unit tests for convenience.
            files: ["**/*.test.*"],
            rules: {
                "typescript/no-non-null-assertion": "off",
                "typescript/no-explicit-any": "off",
                "no-await-in-loop": "off"
            }
        }
    ]
} satisfies OxlintConfig);
