// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { BuildJsOptions, buildJs } from "./buildJs";
import { cleanDir, readText } from "./testing/io";
import { TEMP_DATA_DIR, TEST_DATA_DIR } from "./testing/paths";
import { createMemoryLogger } from "./utils/Logger";
import { normalizeEntryPoints } from "./utils/entryPoints";
import { SUPPORTED_JS_EXTENSIONS } from "./model/PackageModel";
import { RuntimeSupport } from "@open-pioneer/build-common";
import glob from "fast-glob";
import { expectError } from "./testing/helpers";

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
            log("hello from entry point A");
          }

          export { helloA };
          "
        `);
    expect(readText(resolve(outputDirectory, "entryPointB.js"))).toMatchInlineSnapshot(`
          "import { log } from './dir/log.js';

          function helloB() {
            log("hello from entry point B");
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
    expect(readText(resolve(outputDirectory, "./_virtual/_virtual-pioneer-module_react-hooks.js")))
        .toMatchInlineSnapshot(`
          "import { useServiceInternal } from '@open-pioneer/runtime/react-integration';

          const PACKAGE_NAME = "test";
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
            log("hello from entry point A");
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
            "import { log } from "./dir/log";
          import something from "somewhere-external";
          import somethingElse from "@scope/somewhere-external";
          import { useService } from "open-pioneer:react-hooks";

          // Use to prevent warnings
          console.log(something, somethingElse, useService);

          export function helloA() {
              log("hello from entry point A");
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
            return /* @__PURE__ */ jsx("div", { children: "Hello World!" });
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

          export { PI };
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

          export { PI };
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
            "import { PI } from "./utils/helper";

          export interface SomeInterface {
              foo: number;
          }

          export { PI };

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
            return /* @__PURE__ */ jsx("div", { children: message });
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
    const error = await expectError(() =>
        buildJs({
            ...testDefaults(),
            packageDirectory,
            outputDirectory,
            entryPoints
        })
    );
    expect(error.message).toMatch(
        /test-data\/project-using-bad-imports\/index\.js: Imported module \.\/does_not-exist\.txt does not exist\. Attempted lookup with extensions/
    );
});

it("throws if a file without an extension is being imported and the real extension is not supported", async function () {
    const packageDirectory = resolve(TEST_DATA_DIR, "project-importing-unknown-extension");
    const outputDirectory = resolve(TEMP_DATA_DIR, "unknown-extension");
    const entryPoints = normalize(["index"]);

    await cleanDir(outputDirectory);
    const error = await expectError(() =>
        buildJs({
            ...testDefaults(),
            packageDirectory,
            outputDirectory,
            entryPoints
        })
    );
    expect(error.message).toMatch(
        /test-data\/project-importing-unknown-extension\/index\.js: Imported module \.\/Foo does not exist\. Attempted lookup with extensions/
    );
});

it("throws if an import would match multiple files", async function () {
    const packageDirectory = resolve(TEST_DATA_DIR, "project-with-ambiguous-js-imports");
    const outputDirectory = resolve(TEMP_DATA_DIR, "ambiguous-extension");
    const entryPoints = normalize(["entryPoint"]);

    await cleanDir(outputDirectory);
    const error = await expectError(() =>
        buildJs({
            ...testDefaults(),
            packageDirectory,
            outputDirectory,
            entryPoints
        })
    );
    expect(error.message).toMatch(
        /test-data\/project-with-ambiguous-js-imports\/entryPoint\.ts: Imported module \.\/file matches multiple extensions: \.mts, \.tsx, \.js\. Use an explicit extension instead\./
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
        `[RollupError: [plugin check-imports] Aborting due to dependency problems (strict validation is enabled).]`
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

// The project uses a few node dependencies and declares them correctly.
// The files are found on disk, so no errors should be reported.
// The files must not be bundled and their imports must remain as-is.
it("supports imports in node modules", async function () {
    const packageDirectory = resolve(TEST_DATA_DIR, "project-with-valid-node-dependencies");
    const outputDirectory = resolve(TEMP_DATA_DIR, "project-with-valid-node-dependencies");
    const entryPoints = normalize(["index"]);

    const defaults = testDefaults();
    const logger = defaults.logger;

    await cleanDir(outputDirectory);
    await buildJs({
        ...defaults,
        packageDirectory,
        outputDirectory,
        entryPoints,
        strict: false,
        packageJson: {
            dependencies: {
                "package-with-index": "*",
                "package-with-main": "*",
                "package-with-exports": "*"
            }
        }
    });

    // No errors / warnings
    expect(logger.messages).toMatchInlineSnapshot(`[]`);

    // Not bundled
    const outputFile = resolve(outputDirectory, "index.js");
    expect(readText(outputFile)).toMatchInlineSnapshot(`
      "import { PACKAGE_EXPORT } from 'package-with-index';
      import { PACKAGE_EXPORT as PACKAGE_EXPORT$1 } from 'package-with-main';
      import { PACKAGE_EXPORT as PACKAGE_EXPORT$2 } from 'package-with-exports';
      import { PACKAGE_EXPORT as PACKAGE_EXPORT$3 } from 'package-with-exports/other-entry';

      console.log(PACKAGE_EXPORT, PACKAGE_EXPORT$1, PACKAGE_EXPORT$2, PACKAGE_EXPORT$3);
      "
    `);

    // No other files!
    const allFiles = new Set(
        await glob("**/*", {
            cwd: outputDirectory
        })
    );
    expect(allFiles).toMatchInlineSnapshot(`
          Set {
            "index.js",
          }
        `);
});

// The project uses a few node dependencies (still declared correctly in package.json)
// but the actually imported files do not exist.
// The build must fail with sensible error messages.
it("checks that imports to other packages can be resolved at compile time", async function () {
    const packageDirectory = resolve(TEST_DATA_DIR, "project-with-invalid-node-dependencies");
    const outputDirectory = resolve(TEMP_DATA_DIR, "project-with-invalid-node-dependencies");
    const entryPoints = normalize(["index"]);

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
                dependencies: {
                    "package-with-index": "*",
                    "package-with-main": "*",
                    "package-with-exports": "*"
                }
            }
        })
    ).rejects.toMatchInlineSnapshot(
        `[RollupError: [plugin check-imports] Aborting due to dependency problems (strict validation is enabled).]`
    );

    let messages = logger.messages.map((msg) => msg.args[0]! as any).sort() as string[];

    // This plugins emits an additional warning which we don't care about here
    messages = messages.filter((msg) => !msg.includes("[plugin node-resolve]"));

    // No errors / warnings
    expect(messages[0]).toMatch(
        // The node package links to an invalid file via exports
        /Failed to import module 'package-with-exports', the resolved path (.*?) does not exist/
    );
    expect(messages[1]).toMatch(
        // The export does not exist
        /Failed to import module 'package-with-exports\/does-not-exist'/
    );
    expect(messages[2]).toMatch(
        // File does not exist
        /Failed to import module 'package-with-index\/does-not-exist'/
    );
    expect(messages[3]).toMatch(
        // File used for 'main' does not exist
        /Failed to import module 'package-with-main'/
    );
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
