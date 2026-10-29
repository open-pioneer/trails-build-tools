// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { globSync } from "tinyglobby";
import { describe, expect, it, onTestFailed } from "vitest";
import { startVitest } from "vitest/node";
import { pioneer } from ".";
import { TEMP_DATA_DIR, TEST_DATA_DIR, runViteBuild } from "./utils/testUtils";

describe("app metadata", () => {
    it("generates app packages content", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-packages");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-packages");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        const testAppJs = readFileSync(join(outDir, "test-app.js"), "utf-8");
        expect(testAppJs).toContain("AppService");
        expect(testAppJs).toContain('console.debug("App Service constructed");');
        expect(testAppJs).toContain("LogService");
        expect(testAppJs).toContain('console.log("Hello from LogService!!");');
    });

    it("generates app when referencing external Open Pioneer Trails package", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-packages-external/src");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-packages-external");

        await runViteBuild({
            outDir,
            rootDir, // does not contain package ol-map
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        // metadata was read from package.json and contents were found
        const testAppJs = readFileSync(join(outDir, "test-app.js"), "utf-8");
        expect(testAppJs).toContain('console.log("in MapContainer");');
        expect(testAppJs).toContain('console.log("in OlMapRegistry");');
        expect(testAppJs).toContain('console.log("in useMap");');
        expect(testAppJs).toContain('".map {\\n    color: black;\\n}"');
    });

    it("generates app packages content when using dev-, peer- and optional dependencies", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-complex-dependencies");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-complex-dependencies");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        /*
         * Normal deps,required peer dependencies and installed optional dependencies
         * are discovered. Non-existing optional peer dependencies and non existing
         * optional dependencies are not an error.
         *
         * Code from dev dependencies not is not automatically included.
         */
        const testAppJs = readFileSync(join(outDir, "test-app.js"), "utf-8");
        expect(testAppJs).toContain(`console.log("from normal dep");`);
        expect(testAppJs).not.toContain(`console.log("from dev dep");`);
        expect(testAppJs).toContain(`console.log("from peer dep");`);
        expect(testAppJs).toContain(`console.log("from optional dep");`);
    });

    it("generates an error if a required peer's metadata cannot be read", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-missing-peer-dependency");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-missing-peer-dependency");

        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                }
            })
        );

        expect(error.message).toMatch(/Failed to find package 'peer-required'/);
    });

    it("fails if build config is missing", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-build-config-required");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-build-config-required");

        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                }
            })
        );
        expect(error.message).toContain("Expected a build.config.mjs");
        expect(error.message).toContain("test-package");

        const error2 = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app2"]
                }
            })
        );
        expect(error2.message).toContain("Expected a build.config.mjs");
        expect(error2.message).toContain("test-app2");
    });

    it("excludes a service from the generated code if it's disabled by the app", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-disabled-service");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-disabled-service");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        const appJs = readFileSync(join(outDir, "test-app.js"), "utf-8");
        expect(appJs).toContain(`console.log("from A");`);
        expect(appJs).not.toContain(`console.log("from B");`); // excluded because disabled and therefore never imported
    });

    it("generates an error if 'overrides' is used in the build.config.mjs of a package", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-illegal-overrides-in-package");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-illegal-overrides-in-package");

        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                }
            })
        );
        expect(error.message).toMatch(/Overrides are only supported in the app/);
    });

    it("generates an error if a package uses two versions of the same Trails package", async () => {
        // Dependencies:
        // test-app -> dup (v2)
        // test-app -> x -> dup (v1)
        //
        // "dup" cannot be part of the application twice! (this would be allowed for "plain" packages without Open Pioneer Trails extensions)

        const rootDir = resolve(TEST_DATA_DIR, "codegen-duplicate-pioneer-deps");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-duplicate-pioneer-deps");

        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                }
            })
        );

        expect(error.message).toMatch(
            /Encountered the package 'dup' at two different locations\.\nTrails packages cannot be used more than once in the same application\.\nAll packages must use a common version of 'dup'\./
        );
        expect(error.message).toMatch(/dup@2.3.4 at/);
        expect(error.message).toMatch(/dup@1.0.0 at/);
    });

    it("supports dependency cycles", async () => {
        // The important thing about this test is that it terminates!
        // Dependency cycle:
        //      test-app --> a --> b --> a
        const rootDir = resolve(TEST_DATA_DIR, "codegen-packages-cycle");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-packages-cycle");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        const appJs = readFileSync(join(outDir, "test-app.js"), "utf-8");
        expect(appJs).toContain(`console.info("Service A");`);
        expect(appJs).toContain(`console.info("Service B");`);
    });

    it("generates an error if the plugin encounterers an unsupported package metadata format version", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-unsupported-package-format-version/src");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-unsupported-package-format-version");

        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                }
            })
        );
        expect(error.message).toMatch(/uses an unsupported package metadata version/);
    });
});

describe("app css", () => {
    it("generates app css content", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-css");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-css");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        const testAppJs = readFileSync(join(outDir, "test-app.js"), "utf-8");
        expect(testAppJs).toContain(".class-from-app");

        // SCSS
        expect(testAppJs).toContain(".class-from-style1");
        expect(testAppJs).toContain(".class-from-style1 nested {");
        expect(testAppJs).toContain(".class-from-style1-suffix {");
        expect(testAppJs).not.toContain("&-suffix"); // SCSS resolves & to parent selector

        // Normal css
        expect(testAppJs).toContain(".class-from-style2");
    });
});

describe("app i18n", () => {
    it("generates an app with multiple languages", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-i18n");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-i18n");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        const appJs = readFileSync(join(outDir, "test-app.js"), "utf-8");
        expect(appJs).toContain('["de", "en"]');

        const assetsDir = resolve(outDir, "assets");

        const deModule = findModuleContaining(assetsDir, '\\"Hallo Welt\\"');
        expect(deModule).toContain('\\"test-app\\"');
        expect(deModule).toContain('\\"i18n1\\"');
        expect(deModule).toContain('\\"hallo von i18n1\\"');
        expect(deModule).toContain('\\"i18n2\\"');
        expect(deModule).toContain('\\"hallo von i18n2\\"');

        const enModule = findModuleContaining(assetsDir, '\\"Hello world\\"');
        expect(enModule).toContain('\\"test-app\\"');
        expect(enModule).toContain('\\"i18n1\\"');
        expect(enModule).toContain('\\"hello from i18n1\\"');
        expect(enModule).toContain('\\"i18n2\\"');
        expect(enModule).toContain('\\"hello from i18n1\\"');
    });

    it("generates an error if an unsupported locale is requested", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-i18n-unsupported-locale");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-i18n-unsupported-locale");

        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                }
            })
        );

        expect(error.message).toMatch(/does not support locale 'de-simple'/);
    });

    it("generates an error if packages require i18n but the app does not list any supported locales", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-i18n-forgotten");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-i18n-forgotten");

        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                }
            })
        );

        expect(error.message).toMatch(
            "There is no match between the locales supported by the application (none) and the locales supported by the packages 'i18n1' (de, en), 'i18n2' (de, en)."
        );
    });

    it("generates an error if there is no overlap between app locales and package locales", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-i18n-no-overlap");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-i18n-no-overlap");

        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                }
            })
        );

        expect(error.message).toMatch(
            "There is no match between the locales supported by the application (de-simple) and the locales supported by the packages 'i18n1' (de, en), 'i18n2' (de, en)."
        );
    });

    it("supports defining new locales for packages via 'overrides' in an app", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-i18n-new-locale");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-i18n-new-locale");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        const messages = readFileSync(join(outDir, "assets/chunk.js"), "utf-8");
        expect(messages).includes("hello from i18n1 (override)");
    });

    it("generates an error if 'overrides' is used from a package's i18n file", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-i18n-illegal-overrides");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-i18n-illegal-overrides");

        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                }
            })
        );
        expect(error.message).toMatch(/Overrides are only supported in the app/);
    });

    it("generates an error if the i18n file for a locale is missing from a package", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-i18n-missing-yaml");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-i18n-missing-yaml");

        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                }
            })
        );
        expect(error.message).toMatch(
            /I18n file in package 'i18n1' for locale 'en' does not exist/
        );
    });
});

describe("react hooks", () => {
    it("generates react hooks module for packages and apps", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-react-hooks");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-react-hooks");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        const appJs = readFileSync(join(outDir, "test-app.js"), "utf-8");
        expect(appJs).toContain('"import.from.app"');
        expect(appJs).toContain('"import.from.package1"');
        expect(appJs).toContain('"import.from.package2"');
        expect(appJs).toContain("useServiceInternal");
        expect(appJs).toContain("usePropertiesInternal");
        expect(appJs).toContain("useIntlInternal");
    });
});

describe("source info", () => {
    it("generates sourceId constants", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-source-info");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-source-info");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        const appJs = readFileSync(join(outDir, "test-app.js"), "utf-8");

        onTestFailed(() => {
            console.log(`Generated app JS:\n${appJs}`);
        });

        expect(appJs).toMatch(/var sourceId\$?\d? = "package1\/Component";/);
        expect(appJs).toMatch(/var sourceId\$?\d? = "package1\/log";/);
        expect(appJs).toMatch(/var sourceId\$?\d? = "package1\/dir\/log";/);
        expect(appJs).toMatch(/var sourceId\$?\d? = "test-app\/Component";/);
    });

    it("throws if sourceId is used outside a package", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-source-info-edge-cases");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-source-info-edge-cases");

        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                }
            })
        );

        onTestFailed(() => {
            console.log(`Error message:\n${error.message}`);
        });

        expect(error.message).toMatch(/Failed to find package.json for package/);
    });
});

describe("deployment info", () => {
    it("generates code for the application's base url", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-application-base-url");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-application-base-url");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: {
                    "sub/dir/app": "apps/test-app/app.js"
                }
            }
        });

        const appJs = readFileSync(join(outDir, "sub/dir/app.js"), "utf-8");
        onTestFailed(() => {
            console.log(`Generated app JS:\n${appJs}`);
        });

        // Must go two levels up to reach the base url because the app is in sub/dir/app.js
        expect(appJs).toContain("../../__base_url_sentinel__");
    });

    it("generates code for the application's base url with explicit base", async () => {
        const rootDir = resolve(TEST_DATA_DIR, "codegen-application-base-url");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-application-base-url-explicit");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: {
                    "sub/dir/app": "apps/test-app/app.js"
                }
            },
            baseUrl: "/my/deployment/"
        });

        const appJs = readFileSync(join(outDir, "sub/dir/app.js"), "utf-8");
        onTestFailed(() => {
            console.log(`Generated app JS:\n${appJs}`);
        });

        expect(appJs).toContain("/my/deployment/__base_url_sentinel__");
    });
});

describe("test support", () => {
    it("generates test support messages for the package's first locale", async () => {
        const appJs = await buildTestSupportApp("app-default");
        expect(appJs).toContain('"pkg-a": { "greeting": "hello from pkg-a" }');
        expect(appJs).toContain('"pkg-b": { "hello": "hello from pkg-b" }');
        expect(appJs).toContain('"pkg-c": { "hello": "hello from pkg-c" }');
        expect(appJs).toContain('"en");');
    });

    it("generates test support messages for an explicit locale", async () => {
        const appJs = await buildTestSupportApp("app-de");
        expect(appJs).toContain('"pkg-a": { "greeting": "hallo von pkg-a" }');
        expect(appJs).toContain('"pkg-b": { "hello": "hallo von pkg-b" }');
        expect(appJs).toContain('"de");');

        // pkg-c does not support 'de'. Not an error in tests.
        expect(appJs).not.toContain("pkg-c");
    });

    it("generates an error if test support is requested for an undeclared locale", async () => {
        const error = await expectAsyncError(() => buildTestSupportApp("app-fr"));
        expect(error.message).toMatch(
            /Package 'pkg-a' does not define i18n messages for locale 'fr' \(declared locales: en, de\)/
        );
    });

    it("generates empty test support messages for a package without i18n", async () => {
        const appJs = await buildTestSupportApp("app-no-i18n");
        expect(appJs).toContain('console.log({}, "");');
    });

    it("generates an error if the test support query is invalid", async () => {
        for (const app of ["app-bad-query", "app-empty-locale"]) {
            const error = await expectAsyncError(() => buildTestSupportApp(app));
            expect(error.message).toMatch(
                /Invalid query in module id 'open-pioneer:test-support\?.*'\. Expected 'open-pioneer:test-support\?locale=<locale>'\./
            );
        }
    });

    it("generates an error if test support is imported from a plain package", async () => {
        // The importing package lives outside the source root and has no package metadata.
        const rootDir = resolve(TEST_DATA_DIR, "codegen-test-support-plain-importer/src");
        const outDir = resolve(TEMP_DATA_DIR, "codegen-test-support-plain-importer");
        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                },
                testMode: true
            })
        );
        expect(error.message).toMatch(
            /'open-pioneer:test-support' can only be imported from a Trails package\. The package in .*plain-pkg has neither a build\.config\.mjs nor package metadata\./
        );
    });

    it("generates an error if test support is imported outside a test run", async () => {
        const error = await expectAsyncError(() =>
            buildTestSupportApp("app-default", { disableTestMode: true })
        );
        expect(error.message).toMatch(
            /'open-pioneer:test-support' may only be imported from tests\./
        );
    });
});

describe("vitest", () => {
    it("resolves virtual modules on warm runs", async () => {
        const cacheDir = resolve(TEMP_DATA_DIR, "vitest-fs-module-cache");
        rmSync(cacheDir, { recursive: true, force: true });

        expect(await runFixture(cacheDir)).toEqual([]);
        expect(await runFixture(cacheDir)).toEqual([]);
        expect(await runFixture(cacheDir)).toEqual([]);
    });

    /** Runs the tests of the fixture with vitest and returns the messages of all errors. */
    async function runFixture(cacheDir: string): Promise<string[]> {
        const root = resolve(TEST_DATA_DIR, "vitest-fs-module-cache");
        const vitest = await startVitest(
            [],
            {
                root,
                config: false,
                watch: false,
                reporters: [],
                fsModuleCache: true,
                fsModuleCachePath: cacheDir
            },
            { root, cacheDir, plugins: [pioneer({ apps: ["app"] })] }
        );
        try {
            const errors = vitest.state.getUnhandledErrors().map((e) => String(e));
            for (const file of vitest.state.getFiles()) {
                errors.push(...(file.result?.errors ?? []).map((e) => e.message));
                for (const task of file.tasks) {
                    errors.push(...(task.result?.errors ?? []).map((e) => e.message));
                }
            }
            if (vitest.state.getFiles().length === 0) {
                errors.push("No test files found");
            }
            return errors;
        } finally {
            await vitest.close();
        }
    }
});

function findModuleContaining(dir: string, needle: string) {
    const files = globSync("./**/*.js", {
        cwd: dir,
        absolute: true
    });
    for (const file of files) {
        const content = readFileSync(file, "utf-8");
        if (content.includes(needle)) {
            return content;
        }
    }
    throw new Error(`Failed to find file containing ${JSON.stringify(needle)}`);
}

async function buildTestSupportApp(
    appName: string,
    options?: { disableTestMode?: boolean }
): Promise<string> {
    const rootDir = resolve(TEST_DATA_DIR, "codegen-test-support");
    const outDir = resolve(TEMP_DATA_DIR, "codegen-test-support", appName);
    const disableTestMode = options?.disableTestMode ?? false;
    await runViteBuild({
        outDir,
        rootDir,
        pluginOptions: {
            apps: [appName]
        },
        testMode: !disableTestMode
    });
    return readFileSync(join(outDir, `${appName}.js`), "utf-8");
}

function expectAsyncError(fn: () => Promise<unknown>): Promise<any> {
    return new Promise((resolve, reject) => {
        fn().then(() => {
            reject(new Error("unexpected success: expected the operation to fail"));
        }, resolve);
    });
}
