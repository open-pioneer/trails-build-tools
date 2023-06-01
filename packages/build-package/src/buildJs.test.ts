// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BuildJsOptions, buildJs } from "./buildJs";
import { cleanDir, readText } from "./testing/io";
import { TEMP_DATA_DIR, TEST_DATA_DIR } from "./testing/paths";
import { createMemoryLogger } from "./utils/Logger";
import { normalizeEntryPoints } from "./utils/entryPoints";
import { SUPPORTED_JS_EXTENSIONS } from "./model/PackageModel";

describe("buildJS", function () {
    it("transpiles a simple javascript project", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-js-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "simple-js-transpile");
        const entryPoints = normalize(["entryPointA", "entryPointB"]);

        await cleanDir(outputDirectory);
        await buildJs({
            ...testDefaults(),
            packageDirectory,
            outputDirectory,
            entryPoints
        });

        /*
            Configured entry points exist, as do imported files (modules are preserved by default, i.e. no bundling).
            The file which is never imported (hiddenFile.js) is not included.

            External imports must be left as-is.
        */
        expect(readText(resolve(outputDirectory, "entryPointA.js"))).toMatchInlineSnapshot(`
          "import { log } from './dir/log.js';
          import something from 'somewhere-external';
          import somethingElse from '@scope/somewhere-external';
          import hooks from 'open-pioneer:react-hooks';

          console.log(something, somethingElse, hooks);
          function helloA() {
            log(\\"hello from entry point A\\");
          }

          export { helloA };
          "
        `);
        expect(readText(resolve(outputDirectory, "entryPointB.js"))).toMatchInlineSnapshot(`
          "import { log } from './dir/log.js';

          function helloB() {
            log(\\"hello from entry point B\\");
          }

          export { helloB };
          "
        `);
        expect(readText(resolve(outputDirectory, "dir/log.js"))).toMatchInlineSnapshot(`
          "function log(...args) {
            console.log(...args);
          }

          export { log };
          "
        `);
        expect(existsSync(resolve(outputDirectory, "dir/hiddenFile.js"))).toBe(false);
    });

    it("generates source maps when enabled", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-js-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "simple-js-sourcemaps");
        const entryPoints = normalize(["entryPointA", "entryPointB"]);

        await cleanDir(outputDirectory);
        await buildJs({
            ...testDefaults(),
            packageDirectory,
            outputDirectory,
            entryPoints,
            packageName: "@custom/packageName",
            sourceMap: true
        });

        // Expect source map comment at the bottom of the file
        expect(readText(resolve(outputDirectory, "entryPointA.js"))).toMatchInlineSnapshot(`
          "import { log } from './dir/log.js';
          import something from 'somewhere-external';
          import somethingElse from '@scope/somewhere-external';
          import hooks from 'open-pioneer:react-hooks';

          console.log(something, somethingElse, hooks);
          function helloA() {
            log(\\"hello from entry point A\\");
          }

          export { helloA };
          //# sourceMappingURL=entryPointA.js.map
          "
        `);

        // Sourcemap exists
        const sourceMapPath = resolve(outputDirectory, "entryPointA.js.map");
        expect(existsSync(sourceMapPath));

        // Expect pretty source file paths instead of relative local file paths.
        // Also expect that the actual source file content is embedded into the sourcemap.
        const sourceMapData = JSON.parse(readText(sourceMapPath));
        expect(sourceMapData.sources).toMatchInlineSnapshot(`
          [
            "open-pioneer://external-pioneer-packages/@custom/packageName/entryPointA.js",
          ]
        `);
        expect(sourceMapData.sourcesContent).toMatchInlineSnapshot(`
          [
            "import { log } from \\"./dir/log\\";
          import something from \\"somewhere-external\\";
          import somethingElse from \\"@scope/somewhere-external\\";
          import hooks from \\"open-pioneer:react-hooks\\";

          // Use to prevent warnings
          console.log(something, somethingElse, hooks);

          export function helloA() {
              log(\\"hello from entry point A\\");
          }
          ",
          ]
        `);
    });

    it("transpiles jsx to js", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-jsx-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "simple-jsx-transpile");
        const entryPoints = normalize(["index"]);

        await cleanDir(outputDirectory);
        await buildJs({
            ...testDefaults(),
            packageDirectory,
            outputDirectory,
            entryPoints
        });

        expect(readText(resolve(outputDirectory, "index.js"))).toMatchInlineSnapshot(`
          "import { jsx } from 'react/jsx-runtime';

          function Greeting() {
            return /* @__PURE__ */ jsx(\\"div\\", { children: \\"Hello World!\\" });
          }

          export { Greeting };
          "
        `);
    });

    it("transpiles ts to js", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-ts-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "simple-ts-transpile");
        const entryPoints = normalize(["index"]);

        await cleanDir(outputDirectory);
        await buildJs({
            ...testDefaults(),
            packageDirectory,
            outputDirectory,
            entryPoints
        });

        expect(readText(resolve(outputDirectory, "index.js"))).toMatchInlineSnapshot(`
          "import { PI } from './helper.js';

          console.log(PI);
          "
        `);
        expect(readText(resolve(outputDirectory, "helper.js"))).toMatchInlineSnapshot(`
          "const PI = 3.14;

          export { PI };
          "
        `);
    });

    it("transpiles tsx to js", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-tsx-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "simple-tsx-transpile");
        const entryPoints = normalize(["index"]);

        await cleanDir(outputDirectory);
        await buildJs({
            ...testDefaults(),
            packageDirectory,
            outputDirectory,
            entryPoints
        });

        expect(readText(resolve(outputDirectory, "index.js"))).toMatchInlineSnapshot(`
          "import { jsx } from 'react/jsx-runtime';

          function Greeting({ message }) {
            return /* @__PURE__ */ jsx(\\"div\\", { children: message });
          }

          export { Greeting };
          "
        `);
    });

    it("passes through vite-style imports", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "project-using-vite-imports");
        const outputDirectory = resolve(TEMP_DATA_DIR, "vite-imports-passthrough");
        const entryPoints = normalize(["index"]);

        await cleanDir(outputDirectory);
        await buildJs({
            ...testDefaults(),
            packageDirectory,
            outputDirectory,
            entryPoints
        });

        expect(readText(resolve(outputDirectory, "index.js"))).toMatchInlineSnapshot(`
          "import assetUrl from './dir/asset.txt?url';
          import worker from './otherdir/worker.js?worker';

          console.log(assetUrl);
          console.log(worker);
          "
        `);

        // worker.js has been emitted because it was detected as a source code file.
        expect(readText(resolve(outputDirectory, "otherdir/worker.js"))).toMatchInlineSnapshot(`
          "const DOES_NOT_MATTER = 123;

          export { DOES_NOT_MATTER };
          "
        `);
    });

    it("supports various ways to spell entry points", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "project-with-mixed-entry-points");
        const outputDirectory = resolve(TEMP_DATA_DIR, "mixed-entry-points");
        const entryPoints = normalize(["index", "./relative.tsx", "deeply/nested/module"]);
        await cleanDir(outputDirectory);
        await buildJs({
            ...testDefaults(),
            packageDirectory,
            outputDirectory,
            entryPoints
        });

        // Everything is transpiled to ".js"
        expect(existsSync(resolve(outputDirectory, "index.js")));
        expect(existsSync(resolve(outputDirectory, "relative.js")));
        expect(existsSync(resolve(outputDirectory, "deeply/nested/module.js")));
    });

    it("throws an error if an imported file does not exist", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "project-using-bad-imports");
        const outputDirectory = resolve(TEMP_DATA_DIR, "vite-bad-imports");
        const entryPoints = normalize(["index"]);

        await cleanDir(outputDirectory);
        await expect(() =>
            buildJs({
                ...testDefaults(),
                packageDirectory,
                outputDirectory,
                entryPoints
            })
        ).rejects.toMatchInlineSnapshot(
            "[RollupError: Imported module ./does_not-exist.txt does not exist. Attempted lookup with extensions .ts, .mts, .tsx, .js, .mjs, .jsx.]"
        );
    });

    it("throws if a file without an extension is being imported and the real extension is not supported", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "project-importing-unknown-extension");
        const outputDirectory = resolve(TEMP_DATA_DIR, "unknown-extension");
        const entryPoints = normalize(["index"]);

        await cleanDir(outputDirectory);
        await expect(() =>
            buildJs({
                ...testDefaults(),
                packageDirectory,
                outputDirectory,
                entryPoints
            })
        ).rejects.toMatchInlineSnapshot(
            "[RollupError: Imported module ./Foo does not exist. Attempted lookup with extensions .ts, .mts, .tsx, .js, .mjs, .jsx.]"
        );
    });

    it("throws if an import would match multiple files", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "project-with-ambiguous-js-imports");
        const outputDirectory = resolve(TEMP_DATA_DIR, "ambiguous-extension");
        const entryPoints = normalize(["entryPoint"]);

        await cleanDir(outputDirectory);
        await expect(() =>
            buildJs({
                ...testDefaults(),
                packageDirectory,
                outputDirectory,
                entryPoints
            })
        ).rejects.toMatchInlineSnapshot(
            "[RollupError: Imported module ./file matches multiple extensions: .mts, .tsx, .js. Use an explicit extension instead.]"
        );
    });
});

function testDefaults() {
    return {
        packageName: "test",
        sourceMap: false,
        logger: createMemoryLogger()
    } satisfies Partial<BuildJsOptions>;
}

function normalize(entryPoints: string[]) {
    return normalizeEntryPoints(entryPoints, SUPPORTED_JS_EXTENSIONS);
}
