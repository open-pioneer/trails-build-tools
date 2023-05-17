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
        const tempPackage = resolve(TEMP_DATA_DIR, "simple-js-project-copy");
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

        const hiddenFile = resolve(distDirectory, "hiddenFile.js");
        expect(existsSync(hiddenFile)).toBe(false);
    });
});
