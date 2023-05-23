// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { GeneratePackageJsonOptions, generatePackageJson } from "./generatePackageJson";
import { createMemoryLogger } from "./Logger";

describe("generatePackageJson", function () {
    it("generates a minimal package.json", async function () {
        const options = testDefaults();
        const pkgJson = await generatePackageJson({
            ...options,
            strict: false,
            sourcePackageJson: {
                name: "my-package",
                version: "1.0.0",
                license: "MIT",
                publishConfig: {
                    directory: "dist"
                }
            }
        });
        expect(pkgJson).toMatchInlineSnapshot(`
          {
            "exports": {
              "./package.json": "./package.json",
            },
            "license": "MIT",
            "name": "my-package",
            "openPioneerFramework": {
              "packageFormatVersion": "0.1",
            },
            "type": "module",
            "version": "1.0.0",
          }
        `);
        expect(options.logger.messages).toEqual([]); // no warnings
    });

    it("emits a warning when a required fields is missing", async function () {
        const options = testDefaults();
        await generatePackageJson({
            ...options,
            strict: false,
            sourcePackageJson: {
                name: "my-package",
                // missing version
                license: "MIT",
                publishConfig: {
                    directory: "dist"
                }
            }
        });
        expect(options.logger.messages).toMatchInlineSnapshot(`
          [
            {
              "args": [
                "./test-package.json should define a version.",
              ],
              "type": "warn",
            },
          ]
        `);
    });

    it("throws an error when enabling strict validation", async function () {
        const options = testDefaults();
        await expect(() =>
            generatePackageJson({
                ...options,
                sourcePackageJson: {
                    // all required fields missing
                },
                strict: true
            })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
            '"Aborting due to previous validation errors in ./test-package.json (strict validation is enabled)."'
        );
        expect(options.logger.messages).toMatchInlineSnapshot(`
          [
            {
              "args": [
                "./test-package.json should define a name.",
              ],
              "type": "error",
            },
            {
              "args": [
                "./test-package.json should define a version.",
              ],
              "type": "error",
            },
            {
              "args": [
                "./test-package.json should define a license.",
              ],
              "type": "error",
            },
            {
              "args": [
                "./test-package.json should define 'publishConfig.directory' to point to the 'dist' directory (see https://pnpm.io/package_json#publishconfigdirectory).",
              ],
              "type": "error",
            },
          ]
        `);
    });

    it("includes javascript entry points in 'exports'", async function () {
        const options = testDefaults();
        const { exports } = await generatePackageJson({
            ...options,
            jsEntryPoints: [
                {
                    inputModulePath: "./does-not-matter1.js",
                    outputModuleId: "index"
                },
                {
                    inputModulePath: "./does-not-matter2.js",
                    outputModuleId: "other-entry-point"
                }
            ]
        });
        expect(exports).toMatchInlineSnapshot(`
          {
            ".": {
              "import": "./index.js",
            },
            "./other-entry-point": {
              "import": "./other-entry-point.js",
            },
            "./package.json": "./package.json",
          }
        `);
    });

    it("includes css entry point in 'exports'", async function () {
        const options = testDefaults();
        const { exports } = await generatePackageJson({
            ...options,
            cssEntryPoint: {
                inputModulePath: "./does-not-matter1.css",
                outputModuleId: "my-styles"
            }
        });
        expect(exports).toMatchInlineSnapshot(`
          {
            "./my-styles.css": "./my-styles.css",
            "./package.json": "./package.json",
          }
        `);
    });

    it("copies commonly used package.json fields", async function () {
        const sourcePkgJson: Record<string, unknown> = {
            name: "package",
            version: "1.2.3",
            license: "MIT",
            description: "hello world",
            keywords: ["a", "b"],
            homepage: "https://example.com",
            bugs: {
                url: "https://example.com/issues"
            },
            author: {
                name: "T. User"
            },
            contributors: [
                {
                    name: "M. Mustermann"
                }
            ],
            repository: {
                type: "git",
                url: "https://github.com/npm/cli.git"
            },
            dependencies: {
                "other-package": "^1.2.3"
            },
            peerDependencies: {
                vite: "*"
            },
            peerDependenciesMeta: {
                vite: {
                    optional: true
                }
            },
            private: true
        };
        const pkgJson = await generatePackageJson({
            ...testDefaults(),
            sourcePackageJson: {
                ...sourcePkgJson,
                // Just to pass validation
                publishConfig: {
                    directory: "dist"
                }
            }
        });

        for (const key of Object.keys(sourcePkgJson)) {
            expect(pkgJson[key], `validating key '${key}'`).toEqual(sourcePkgJson[key]);
        }
    });
});

function testDefaults() {
    return {
        buildConfig: {},
        buildConfigPath: "./test-build-config",
        sourcePackageJson: {
            name: "test-package",
            version: "1.0.0",
            license: "MIT",
            publishConfig: {
                directory: "dist"
            }
        },
        sourcePackageJsonPath: "./test-package.json",
        logger: createMemoryLogger(),
        strict: true,
        jsEntryPoints: [],
        cssEntryPoint: undefined
    } satisfies Partial<GeneratePackageJsonOptions>;
}
