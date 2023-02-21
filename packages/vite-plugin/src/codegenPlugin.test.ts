// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { assert } from "chai";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runViteBuild, TEMP_DATA, TEST_DATA } from "./utils/testUtils";
import glob from "fast-glob";

describe("codegen support", function () {
    it("generates app packages content", async function () {
        const rootDir = resolve(TEST_DATA, "codegen-packages");
        const outDir = resolve(TEMP_DATA, "codegen-packages");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        const testAppJs = readFileSync(join(outDir, "test-app.js"), "utf-8");
        assert.include(testAppJs, "AppService");
        assert.include(testAppJs, 'console.debug("App Service constructed");');
        assert.include(testAppJs, "LogService");
        assert.include(testAppJs, 'console.log("Hello from LogService!!");');
    });

    it("generates app css content", async function () {
        const rootDir = resolve(TEST_DATA, "codegen-css");
        const outDir = resolve(TEMP_DATA, "codegen-css");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        const testAppJs = readFileSync(join(outDir, "test-app.js"), "utf-8");
        assert.include(testAppJs, ".class-from-app");
        assert.include(testAppJs, ".class-from-style1");
        assert.include(testAppJs, ".class-from-style2");
    });

    it("generates react hooks module for packages and apps", async function () {
        const rootDir = resolve(TEST_DATA, "codegen-react-hooks");
        const outDir = resolve(TEMP_DATA, "codegen-react-hooks");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        const appJs = readFileSync(join(outDir, "test-app.js"), "utf-8");
        assert.include(appJs, '"import.from.app"');
        assert.include(appJs, '"import.from.package1"');
        assert.include(appJs, '"import.from.package2"');
    });

    it("fails if build config is missing", async function () {
        const rootDir = resolve(TEST_DATA, "codegen-build-config-required");
        const outDir = resolve(TEMP_DATA, "codegen-build-config-required");

        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                }
            })
        );
        assert.include(error.message, "Expected a build.config.mjs", "test-app");
        assert.include(error.message, "test-package", "test-app");

        const error2 = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app2"]
                }
            })
        );
        assert.include(error2.message, "Expected a build.config.mjs", "test-app2");
        assert.include(error2.message, "test-app2", "test-app2");
    });

    it("generates an app with multiple languages", async function () {
        const rootDir = resolve(TEST_DATA, "codegen-i18n");
        const outDir = resolve(TEMP_DATA, "codegen-i18n");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        const appJs = readFileSync(join(outDir, "test-app.js"), "utf-8");
        assert.include(appJs, '["de", "en"]');

        const assetsDir = resolve(outDir, "assets");

        const deModule = findModuleContaining(assetsDir, '"Hallo Welt"');
        assert.include(deModule, '"test-app"');
        assert.include(deModule, '"i18n1"');
        assert.include(deModule, '"hallo von i18n1"');
        assert.include(deModule, '"i18n2"');
        assert.include(deModule, '"hallo von i18n2"');

        const enModule = findModuleContaining(assetsDir, '"Hello world"');
        assert.include(enModule, '"test-app"');
        assert.include(enModule, '"i18n1"');
        assert.include(enModule, '"hello from i18n1"');
        assert.include(enModule, '"i18n2"');
        assert.include(enModule, '"hello from i18n1"');
    });

    it("generates an error if an unsupported locale is requested", async function () {
        const rootDir = resolve(TEST_DATA, "codegen-i18n-unsupported-locale");
        const outDir = resolve(TEMP_DATA, "codegen-i18n-unsupported-locale");

        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                }
            })
        );

        assert.match(error.message, /requires messages for locale 'de-simple'/);
    });

    it("generates an error if 'overrides' is used from a package", async function () {
        const rootDir = resolve(TEST_DATA, "codegen-i18n-illegal-overrides");
        const outDir = resolve(TEMP_DATA, "codegen-i18n-illegal-overrides");

        const error = await expectAsyncError(() =>
            runViteBuild({
                outDir,
                rootDir,
                pluginOptions: {
                    apps: ["test-app"]
                }
            })
        );
        assert.match(error.message, /Overrides are only supported in the app/);
    });
});

function findModuleContaining(dir: string, needle: string) {
    const files = glob.sync("./**/*.js", {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expectAsyncError(fn: () => Promise<void>): Promise<any> {
    return new Promise((resolve, reject) => {
        fn().then(() => {
            reject(new Error("unexpected success"));
        }, resolve);
    });
}
