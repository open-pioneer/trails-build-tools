// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildJS } from "./buildJs";
import { cleanDir, readText } from "./testUtils/io";
import { TEST_DATA_DIR } from "./testUtils/paths";

describe("buildJS", function () {
    it("should transpile a simple javascript project", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "simple-js-project");
        const distDirectory = resolve(packageDirectory, "dist");

        const entryPoints = ["entryPointA", "entryPointB"];
        await cleanDir(distDirectory);
        await buildJS({
            packageDirectory,
            entryPoints,
            sourcemap: false
        });

        /*
            Configured entry points exist, as do imported files (modules are preserved by default, i.e. no bundling).
            The file which is never imported (hiddenFile.js) is not included.
        */
        expect(readText(resolve(distDirectory, "entryPointA.js"))).toMatchInlineSnapshot(`
          "import { log } from './dir/log.js';

          function helloA() {
              log(\\"hello from entry point A\\");
          }

          export { helloA };
          "
        `);
        expect(readText(resolve(distDirectory, "entryPointB.js"))).toMatchInlineSnapshot(`
          "import { log } from './dir/log.js';

          function helloB() {
              log(\\"hello from entry point B\\");
          }

          export { helloB };
          "
        `);
        expect(readText(resolve(distDirectory, "dir/log.js"))).toMatchInlineSnapshot(`
          "function log(...args) {
              console.log(...args);
          }

          export { log };
          "
        `);
        expect(existsSync(resolve(distDirectory, "dir/hiddenFile.js"))).toBe(false);
    });
});
