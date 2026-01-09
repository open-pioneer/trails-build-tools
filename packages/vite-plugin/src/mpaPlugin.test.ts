// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runViteBuild, TEMP_DATA_DIR, TEST_DATA_DIR } from "./utils/testUtils";
import { describe, it, assert, expect } from "vitest";
import { globSync } from "tinyglobby";

describe("multi page support", function () {
    it("should include the root site if configured", async function () {
        const outDir = resolve(TEMP_DATA_DIR, "multi-page-root-site");
        const rootDir = resolve(TEST_DATA_DIR, "multi-page");

        await runViteBuild({
            outDir,
            rootDir: rootDir,
            pluginOptions: {
                rootSite: true
            }
        });

        const indexHtml = readFileSync(join(outDir, "index.html"), "utf-8");
        assert.include(indexHtml, "<title>Root Site</title>");

        const appExists = existsSync(join(outDir, "app1.js"));
        assert.isFalse(appExists);

        const siteExists = existsSync(join(outDir, "sites/site1/index.html"));
        assert.isFalse(siteExists);
    });

    it("should include app entry points if configured", async function () {
        const outDir = resolve(TEMP_DATA_DIR, "multi-page-apps");
        const rootDir = resolve(TEST_DATA_DIR, "multi-page");

        await runViteBuild({
            outDir,
            rootDir: rootDir,
            pluginOptions: {
                apps: ["app1", "app2"]
            }
        });

        const app1 = readFileSync(join(outDir, "app1.js"), "utf-8");
        assert.include(app1, "Hello from app1");

        const app2 = readFileSync(join(outDir, "app2.js"), "utf-8");
        assert.include(app2, "Hello from app2");

        const rootSiteExists = existsSync(join(outDir, "index.html"));
        assert.isFalse(rootSiteExists);

        const siteExists = existsSync(join(outDir, "sites/site1/index.html"));
        assert.isFalse(siteExists);
    });

    it("should include apps with advanced locations", async function () {
        const outDir = resolve(TEMP_DATA_DIR, "multi-page-advanced-apps");
        const rootDir = resolve(TEST_DATA_DIR, "multi-page-advanced-apps");

        await runViteBuild({
            outDir,
            rootDir: rootDir,
            pluginOptions: {
                apps: {
                    "app-1": "custom/location/app.ts",
                    "app-2": "my/deeply/nested/app/custom-name.js"
                }
            }
        });

        const app1 = readFileSync(join(outDir, "app-1.js"), "utf-8");
        assert.include(app1, '"hello from custom location"');

        const app2 = readFileSync(join(outDir, "app-2.js"), "utf-8");
        assert.include(app2, '"hello from deeply nested app"');
    });

    it("should include additional sites if configured", async function () {
        const outDir = resolve(TEMP_DATA_DIR, "multi-page-sites");
        const rootDir = resolve(TEST_DATA_DIR, "multi-page");

        await runViteBuild({
            outDir,
            rootDir: rootDir,
            pluginOptions: {
                sites: ["sites/site1", "sites/site2"]
            }
        });

        const rootSiteExists = existsSync(join(outDir, "index.html"));
        assert.isFalse(rootSiteExists, "root site must not exist");

        const appExists = existsSync(join(outDir, "app1.js"));
        assert.isFalse(appExists);

        const site1 = readFileSync(join(outDir, "sites/site1/index.html"), "utf-8");
        assert.include(site1, "<title>Site1</title>");

        const site2 = readFileSync(join(outDir, "sites/site2/index.html"), "utf-8");
        assert.include(site2, "<title>Site2</title>");
    });

    it("should throw an error if no entry points are configured", async function () {
        const outDir = resolve(TEMP_DATA_DIR, "multi-page-no-entry-points");
        const rootDir = resolve(TEST_DATA_DIR, "multi-page");
        let message = "";
        try {
            await runViteBuild({
                outDir,
                rootDir: rootDir,
                pluginOptions: {}
            });
            throw new Error("expected error");
        } catch (e) {
            if (e instanceof Error) {
                message = e.message;
            }
        }

        assert.strictEqual(
            message,
            "You must configure at least one site or one app in the pioneer plugin options."
        );
    });

    it("should preserve exports from an app", async function () {
        const outDir = resolve(TEMP_DATA_DIR, "app-with-exports");
        const rootDir = resolve(TEST_DATA_DIR, "app-with-exports");

        await runViteBuild({
            outDir,
            rootDir: rootDir,
            pluginOptions: {
                apps: ["my-app"]
            }
        });

        const appExists = existsSync(join(outDir, "my-app.js"));
        expect(appExists).toBe(true);

        const appContent = readFileSync(join(outDir, "my-app.js"), "utf-8");
        expect(appContent).toMatchInlineSnapshot(`
          "const SOME_EXPORT = 42;
          export { SOME_EXPORT };
          "
        `);
    });

    it("should bundle referenced code when only used from html", async function () {
        const outDir = resolve(TEMP_DATA_DIR, "normal-site-with-js");
        const rootDir = resolve(TEST_DATA_DIR, "normal-site-with-js");

        await runViteBuild({
            outDir,
            rootDir: rootDir,
            pluginOptions: {
                rootSite: true
            }
        });

        const siteExists = existsSync(join(outDir, "index.html"));
        expect(siteExists).toBe(true);

        const assets = globSync("assets/**/*.js", {
            cwd: outDir,
            absolute: true
        });
        expect(assets).toHaveLength(1); // expect a single js chunk

        const chunkFileName = assets[0]!;
        const chunkContent = readFileSync(chunkFileName, "utf-8");
        expect(chunkContent).includes(`console.log("hello from hello.js")`);
    });
});
