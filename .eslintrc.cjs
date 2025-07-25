module.exports = {
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/typescript",
        "prettier"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "projectService": true,
        "tsconfigRootDir": __dirname
    },
    "plugins": ["@typescript-eslint", "import", "unused-imports", "header"],
    "env": {
        "node": true,
        "browser": true
    },
    "root": true,
    "settings": {
        "import/resolver": {
            "typescript": true,
            "node": true
        }
    },
    "rules": {
        "quotes": [
            "error",
            "double",
            {
                "avoidEscape": true,
                "allowTemplateLiterals": true
            }
        ],
        "semi": ["error", "always"],

        "header/header": [
            "error",
            "line",
            [
                " SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)",
                " SPDX-License-Identifier: Apache-2.0"
            ]
        ],

        // Disallow relative import into another package, e.g. `../other-package/foo`
        "import/no-relative-packages": "error",

        // Warn/error for unused imports and variables.
        // Variables can be prefixed with _ to disable the warning when necessary.
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "unused-imports/no-unused-imports": "warn",
        "unused-imports/no-unused-vars": [
            "warn",
            {
                "vars": "all",
                "varsIgnorePattern": "^_",
                "caughtErrors": "all",
                "caughtErrorsIgnorePattern": "^_",
                "args": "after-used",
                "argsIgnorePattern": "^_"
            }
        ],

        // Allow {} as type
        "@typescript-eslint/no-empty-object-type": "off",

        "@typescript-eslint/no-unused-expressions": [
            "error",
            {
                "allowShortCircuit": true
            }
        ],

        "@typescript-eslint/no-deprecated": "warn"
    },

    "overrides": [
        {
            "files": ["*.test.*"],
            "rules": {
                // Allow  in test files
                "@typescript-eslint/no-non-null-assertion": "off",
                "@typescript-eslint/no-explicit-any": "off"
            }
        }
    ]
};
