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
import { RuntimeSupport } from "@open-pioneer/build-common";

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
          import { useService } from './_virtual/_virtual-pioneer-module_react-hooks.js';

          console.log(something, somethingElse, useService);
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

        // React hooks are transpiled
        expect(
            readText(resolve(outputDirectory, "./_virtual/_virtual-pioneer-module_react-hooks.js"))
        ).toMatchInlineSnapshot(`
          "import { useServiceInternal } from '@open-pioneer/runtime/react-integration';

          const PACKAGE_NAME = \\"test\\";
          const useService = /*@__PURE__*/ useServiceInternal.bind(undefined, PACKAGE_NAME);

          export { useService };
          "
        `);

        // Not included because never referenced:
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
          import { useService } from './_virtual/_virtual-pioneer-module_react-hooks.js';

          console.log(something, somethingElse, useService);
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
            "entryPointA.js",
          ]
        `);
        expect(sourceMapData.sourcesContent).toMatchInlineSnapshot(`
          [
            "import { log } from \\"./dir/log\\";
          import something from \\"somewhere-external\\";
          import somethingElse from \\"@scope/somewhere-external\\";
          import { useService } from \\"open-pioneer:react-hooks\\";

          // Use to prevent warnings
          console.log(something, somethingElse, useService);

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
          "import { PI } from './utils/helper.js';

          console.log(PI);
          "
        `);
        expect(readText(resolve(outputDirectory, "utils/helper.js"))).toMatchInlineSnapshot(`
          "const PI = 3.14;

          export { PI };
          "
        `);
    });

    it("generates correct sourcemaps for ts", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-ts-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "simple-ts-sourcemaps");
        const entryPoints = normalize(["index"]);

        await cleanDir(outputDirectory);
        await buildJs({
            ...testDefaults(),
            packageDirectory,
            outputDirectory,
            entryPoints,
            sourceMap: true
        });

        expect(readText(resolve(outputDirectory, "index.js"))).toMatchInlineSnapshot(`
          "import { PI } from './utils/helper.js';

          console.log(PI);
          //# sourceMappingURL=index.js.map
          "
        `);
        const { sources: indexSources, sourcesContent: indexSourcesContent } = JSON.parse(
            readText(resolve(outputDirectory, "index.js.map"))
        );
        expect(indexSources).toMatchInlineSnapshot(`
          [
            "index.ts",
          ]
        `);
        expect(indexSourcesContent).toMatchInlineSnapshot(`
          [
            "import { PI } from \\"./utils/helper\\";

          export interface SomeInterface {
              foo: number;
          }

          console.log(PI);
          ",
          ]
        `);
        expect(readText(resolve(outputDirectory, "utils/helper.js"))).toMatchInlineSnapshot(`
          "const PI = 3.14;

          export { PI };
          //# sourceMappingURL=helper.js.map
          "
        `);
        const { sources: helperSources, sourcesContent: helperSourcesContent } = JSON.parse(
            readText(resolve(outputDirectory, "utils/helper.js.map"))
        );
        expect(helperSources).toMatchInlineSnapshot(`
          [
            "helper.ts",
          ]
        `);
        expect(helperSourcesContent).toMatchInlineSnapshot(`
          [
            "export const PI = 3.14;
          ",
          ]
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

    it("throws when a project uses external dependencies but does not reference it in its package.json", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-js-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "simple-js-undeclared-deps");
        const entryPoints = normalize(["entryPointA", "entryPointB"]);

        const defaults = testDefaults();
        const logger = defaults.logger;

        await cleanDir(outputDirectory);
        await expect(() =>
            buildJs({
                ...defaults,
                packageDirectory,
                outputDirectory,
                entryPoints,
                strict: true,
                packageJson: {
                    // no deps
                }
            })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
            '"Aborting due to dependency problems (strict validation is enabled)."'
        );

        const messages = logger.messages.map((msg) => msg.args[0]! as any).sort();
        expect(messages[0]).toMatch(
            /Failed to import '@open-pioneer\/runtime\/react-integration', the package '@open-pioneer\/runtime' must be configured/
        );
        expect(messages[1]).toMatch(
            /Failed to import '@scope\/somewhere-external', the package '@scope\/somewhere-external' must be configured/
        );
        expect(messages[2]).toMatch(
            /Failed to import 'somewhere-external', the package 'somewhere-external' must be configured either as a dependency or as a peerDependency in test\/package\.json/
        );
    });
});

function testDefaults() {
    return {
        packageName: "test",
        sourceMap: false,
        strict: false,
        logger: createMemoryLogger(),
        packageJson: {
            dependencies: {
                [RuntimeSupport.RUNTIME_PACKAGE_NAME]: "*"
            }
        },
        packageJsonPath: "test/package.json"
    } satisfies Partial<BuildJsOptions>;
}

function normalize(entryPoints: string[]) {
    return normalizeEntryPoints(entryPoints, SUPPORTED_JS_EXTENSIONS);
}
