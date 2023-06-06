// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { cp } from "fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cleanDir, readText } from "./testing/io";
import { TEMP_DATA_DIR, TEST_DATA_DIR } from "./testing/paths";
import { existsSync } from "fs";
import { build } from ".";

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
        await build({ packageDirectory: tempPackage, silent: true });

        const entryPointA = resolve(distDirectory, "entryPointA.js");
        expect(readText(entryPointA)).toMatchInlineSnapshot(`
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

        const entryPointB = resolve(distDirectory, "entryPointB.js");
        expect(readText(entryPointB)).toMatchInlineSnapshot(`
          "import { log } from './dir/log.js';

          function helloB() {
            log(\\"hello from entry point B\\");
          }

          export { helloB };
          //# sourceMappingURL=entryPointB.js.map
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

          /*# sourceMappingURL=my-styles.css.map */"
        `);

        // Package.json was generated
        const packageJson = resolve(distDirectory, "package.json");
        expect(JSON.parse(readText(packageJson))).toMatchInlineSnapshot(`
          {
            "dependencies": {
              "@open-pioneer/runtime": "*",
              "@scope/somewhere-external": "*",
              "foo": "^1.2.3",
              "somewhere-external": "*",
            },
            "exports": {
              "./entryPointA": {
                "import": "./entryPointA.js",
                "types": "./entryPointA.d.ts",
              },
              "./entryPointB": {
                "import": "./entryPointB.js",
                "types": "./entryPointB.d.ts",
              },
              "./my-styles.css": "./my-styles.css",
              "./package.json": "./package.json",
            },
            "license": "MIT",
            "name": "simple-js-project",
            "openPioneerFramework": {
              "i18n": {
                "languages": [],
              },
              "packageFormatVersion": "1.0.0",
              "properties": [],
              "services": [],
              "styles": "./my-styles.css",
              "ui": {
                "references": [],
              },
            },
            "type": "module",
            "version": "0.0.1",
          }
        `);

        // License, changelog and readme were copied
        const readme = resolve(distDirectory, "README.md");
        expect(readText(readme)).toMatchInlineSnapshot(`
          "# README for simple package
          "
        `);

        const changelog = resolve(distDirectory, "CHANGELOG.md");
        expect(readText(changelog)).toMatchInlineSnapshot(`
          "# Changelog for simple package
          "
        `);

        const license = resolve(distDirectory, "LICENSE");
        expect(readText(license)).toMatchInlineSnapshot(`
          "LICENSE
          "
        `);
    });
});
