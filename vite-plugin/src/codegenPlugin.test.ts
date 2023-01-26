import { assert } from "chai";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { runViteBuild, TEMP_DATA, TEST_DATA } from "./utils/testUtils";

describe("codegen support", function () {
    it.only("should generate app content", async function () {
        const rootDir = resolve(TEST_DATA, "codegen");
        const outDir = resolve(TEMP_DATA, "codegen");

        await runViteBuild({
            outDir,
            rootDir,
            pluginOptions: {
                apps: ["test-app"]
            }
        });

        const testAppJs = readFileSync(join(outDir, "test-app.js"), "utf-8");
        assert.include(testAppJs, "LogService");
        // eslint-disable-next-line quotes
        assert.include(testAppJs, 'console.log("Hello from LogService!!");');
    });
});
