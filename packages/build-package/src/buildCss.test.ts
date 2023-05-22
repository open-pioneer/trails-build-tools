// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { TEMP_DATA_DIR, TEST_DATA_DIR } from "./testUtils/paths";
import { resolve } from "node:path";
import { cleanDir, readText } from "./testUtils/io";
import { BuildCssOptions, SUPPORTED_EXTENSIONS, buildCss } from "./buildCss";
import { normalizeEntryPoint } from "./helpers";

const DEFAULTS = {
    packageName: "test",
    silent: true,
    sourceMap: false
} satisfies Partial<BuildCssOptions>;

describe("buildCss", function () {
    it("bundles local css files", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-css-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "simple-css-transpile");

        await cleanDir(outputDirectory);
        await buildCss({
            ...DEFAULTS,
            packageDirectory,
            outputDirectory,
            cssEntryPoint: normalize("styles.css")
        });

        /*
            Local imports (e.g. "./foo.css") are resolved and concatenated.
         */
        expect(readText(resolve(outputDirectory, "styles.css"))).toMatchInlineSnapshot(`
          ".imported {
              color: green;
          }

          .main {
              padding: 1;
          }
          "
        `);
    });

    it("does not bundle external css files", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "project-with-complex-css-imports");
        const outputDirectory = resolve(TEMP_DATA_DIR, "complex-css-imports");

        await cleanDir(outputDirectory);
        await buildCss({
            ...DEFAULTS,
            packageDirectory,
            outputDirectory,
            cssEntryPoint: normalize("./myStyles.css")
        });

        /* 
            Non-local css files are not bundled.
        */
        expect(readText(resolve(outputDirectory, "myStyles.css"))).toMatchInlineSnapshot(`
          "
          @import \\"ol/ol.css\\";
          @import \\"ol/ol.css\\";
          @import \\"https://example.com/styles.css\\";
          @import \\"cssrecipes-defaults\\";
          @import \\"normalize.css\\";
          @import \\"foo.css\\";
          @import url(foo-1.css);
          @import url(\\"foo-2.css\\");
          @import \\"bar.css\\" (min-width: 25em);
          @import \\"baz.css\\" layer(baz-layer);
          /* This import must not be bundled because it points to an external dependency */
          .foo {
              color: white;
          }
          /* 
              From postcss-import examples.
              None of these should be bundled.
          */
          .main {
              padding: 1;
          }
          "
        `);
    });

    it("throws an error if a relative import references node modules", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "project-importing-node-modules-from-css");
        const outputDirectory = resolve(TEMP_DATA_DIR, "importing-node-modules-from-css");

        await cleanDir(outputDirectory);
        await expect(() =>
            buildCss({
                ...DEFAULTS,
                packageDirectory,
                outputDirectory,
                cssEntryPoint: normalize("styles.css")
            })
        ).rejects.toSatisfy((error) => {
            const nestedMessage = ((error as Error)?.cause as Error)?.message;
            //console.log(nestedMessage);
            return !!nestedMessage.match(/Detected an attempt to import from node_modules/);
        });
    });

    it("generates source maps", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-css-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "simple-css-sourcemaps");

        await cleanDir(outputDirectory);
        await buildCss({
            ...DEFAULTS,
            packageName: "@my-scope/my-test-package",
            packageDirectory,
            outputDirectory,
            cssEntryPoint: normalize("styles.css"),
            sourceMap: true
        });

        /*
            Local imports (e.g. "./foo.css") are resolved and concatenated.
         */
        expect(readText(resolve(outputDirectory, "styles.css"))).toMatchInlineSnapshot(`
          ".imported {
              color: green;
          }

          .main {
              padding: 1;
          }

          /*# sourceMappingURL=styles.css.map */"
        `);

        // Paths should be consistent with the paths generated for javascript files.
        const sourceMapData = JSON.parse(readText(resolve(outputDirectory, "styles.css.map")));
        expect(sourceMapData.sources).toMatchInlineSnapshot(`
          [
            "/external-packages/@my-scope/my-test-package/importedStyles.css",
            "/external-packages/@my-scope/my-test-package/styles.css",
          ]
        `);
        expect(sourceMapData.sourcesContent).toMatchInlineSnapshot(`
          [
            ".imported {
              color: green;
          }
          ",
            "@import \\"./importedStyles.css\\";

          .main {
              padding: 1;
          }
          ",
          ]
        `);
    });

    it("bundles local scss files", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-scss-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "simple-scss-transpile");

        await cleanDir(outputDirectory);
        await buildCss({
            ...DEFAULTS,
            packageDirectory,
            outputDirectory,
            cssEntryPoint: normalize("my-styles.scss")
        });

        /*
            Local imports (e.g. "./foo.css") are resolved and concatenated.
         */
        expect(readText(resolve(outputDirectory, "my-styles.css"))).toMatchInlineSnapshot(`
          ".from-css {
              color: white;
          }
          body {
            height: 100%;
          }
          .a .b-c {
            color: green;
          }"
        `);
    });

    it("does not bundle external scss files", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "project-with-complex-scss-imports");
        const outputDirectory = resolve(TEMP_DATA_DIR, "complex-scss-imports");

        await cleanDir(outputDirectory);
        await buildCss({
            ...DEFAULTS,
            packageDirectory,
            outputDirectory,
            cssEntryPoint: normalize("./main.scss")
        });

        /* 
            Non-local css files are not bundled.

            The exception to this (in the sass case) is css emitted by sass modules
            found in node_modules.

            Imports that look like "plain" css imports are preserved, see also:
            https://sass-lang.com/documentation/at-rules/import#plain-css-imports
        */
        expect(readText(resolve(outputDirectory, "main.css"))).toMatchInlineSnapshot(`
          "@import \\"ol/ol.css\\";
          @import \\"ol/ol.css\\";
          @import \\"https://example.com/styles.css\\";
          @import \\"normalize.css\\";
          @import \\"foo.css\\";
          @import url(foo-1.css);
          @import url(\\"foo-2.css\\");
          @import \\"bar.css\\" (min-width: 25em);
          .from-local-css-module {
              color: white;
          }
          .from-local-sass-module {
            color: white;
          }
          .from-external-sass-module {
            color: green;
          }
          .main {
            padding: 1;
          }"
        `);
    });

    it("generates source maps for scss files", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-scss-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "simple-scss-sourcemaps");

        await cleanDir(outputDirectory);
        await buildCss({
            ...DEFAULTS,
            packageName: "@my-scope/my-test-package",
            packageDirectory,
            outputDirectory,
            cssEntryPoint: normalize("my-styles.scss"),
            sourceMap: true
        });

        /*
            Local imports (e.g. "./foo.css") are resolved and concatenated.
         */
        expect(readText(resolve(outputDirectory, "my-styles.css"))).toMatchInlineSnapshot(`
          ".from-css {
              color: white;
          }
          body {
            height: 100%;
          }
          .a .b-c {
            color: green;
          } 
          /*# sourceMappingURL=my-styles.css.map */"
        `);

        // Paths should be consistent with the paths generated for javascript files.
        const sourceMapData = JSON.parse(readText(resolve(outputDirectory, "my-styles.css.map")));
        expect(sourceMapData.sources).toMatchInlineSnapshot(`
          [
            "/external-packages/@my-scope/my-test-package/cssFile.css",
            "/external-packages/@my-scope/my-test-package/_test_module.scss",
            "/external-packages/@my-scope/my-test-package/my-styles.scss",
          ]
        `);
        expect(sourceMapData.sourcesContent).toMatchInlineSnapshot(`
          [
            ".from-css {
              color: white;
          }
          ",
            "@import \\"./cssFile.css\\";

          body {
              height: 100%;
          }
          ",
            "@import \\"./test_module\\";

          .a {
              .b {
                  &-c {
                      color: green;
                  }
              }
          }
          ",
          ]
        `);
    });
});

function normalize(entryPoints: string) {
    return normalizeEntryPoint(entryPoints, SUPPORTED_EXTENSIONS);
}
