// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { cp } from "fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cleanDir, readText } from "./testUtils/io";
import { TEMP_DATA_DIR, TEST_DATA_DIR } from "./testUtils/paths";
import { existsSync } from "fs";
import { internalBuild } from "./index";

describe("build", function () {
    it("should build package to `dist`", async function () {
        const srcPackage = resolve(TEST_DATA_DIR, "simple-js-project");
        const tempPackage = resolve(TEMP_DATA_DIR, "simple-js-project");
        const distDirectory = resolve(tempPackage, "dist");

        await cleanDir(tempPackage);
        await cp(srcPackage, tempPackage, {
            recursive: true,
            force: true
        });
        await internalBuild({ packageDirectory: tempPackage, silent: true });

        const entryPointA = resolve(distDirectory, "entryPointA.js");
        expect(readText(entryPointA)).toMatchInlineSnapshot(`
          "import { log } from './dir/log.js';
          import 'somewhere-external';
          import '@scope/somewhere-external';
          import 'open-pioneer:react-hooks';

          function helloA() {
            log(\\"hello from entry point A\\");
          }

          export { helloA };
          "
        `);

        const entryPointB = resolve(distDirectory, "entryPointB.js");
        expect(readText(entryPointB)).toMatchInlineSnapshot(`
          "import { log } from './dir/log.js';

          function helloB() {
            log(\\"hello from entry point B\\");
          }

          export { helloB };
          "
        `);

        // Not included
        const hiddenFile = resolve(distDirectory, "hiddenFile.js");
        expect(existsSync(hiddenFile)).toBe(false);

        // Styles are present
        const styles = resolve(distDirectory, "my-styles.css");
        expect(readText(styles)).toMatchInlineSnapshot(`
          ".main {
              color: green;
          }
          "
        `);

        // Package.json was generated
        const packageJson = resolve(distDirectory, "package.json");
        expect(JSON.parse(readText(packageJson))).toMatchInlineSnapshot(`
          {
            "dependencies": {
              "foo": "^1.2.3",
            },
            "exports": {
              "./entryPointA": {
                "import": "./entryPointA.js",
              },
              "./entryPointB": {
                "import": "./entryPointB.js",
              },
              "./my-styles.css": "./my-styles.css",
              "./package.json": "./package.json",
            },
            "license": "MIT",
            "name": "simple-js-project",
            "openPioneerFramework": {
              "packageFormatVersion": "0.1",
              "styles": "./my-styles.css",
            },
            "type": "module",
            "version": "0.0.1",
          }
        `);
    });
});
