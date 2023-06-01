// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from "vitest";
import { TEMP_DATA_DIR, TEST_DATA_DIR } from "./testing/paths";
import { resolve } from "node:path";
import { cleanDir, readText } from "./testing/io";
import { buildPackage } from "./buildPackage";
import { createMemoryLogger } from "./utils/Logger";
import { createInputModel } from "./model/InputModel";

it("copies i18n files when configured in build.config.js", async function () {
    const packageDirectory = resolve(TEST_DATA_DIR, "project-with-i18n");
    const outputDirectory = resolve(TEMP_DATA_DIR, "project-with-i18n");
    await cleanDir(outputDirectory);

    const logger = createMemoryLogger();
    await buildPackage({
        input: await createInputModel(packageDirectory, {
            requireChangelog: false,
            requireLicense: false,
            requireReadme: false
        }),
        clean: false,
        logger,
        outputDirectory,
        sourceMaps: false,
        strict: false
    });

    expect(readText(resolve(outputDirectory, "i18n/de.yaml"))).toMatchInlineSnapshot(`
      "messages:
          hello: \\"Hallo\\"
      "
    `);
    expect(readText(resolve(outputDirectory, "i18n/de-simple.yaml"))).toMatchInlineSnapshot(`
      "messages:
          hello: \\"Hallo\\"
      "
  `);
    expect(readText(resolve(outputDirectory, "i18n/en.yaml"))).toMatchInlineSnapshot(`
      "messages:
          hello: \\"Hello\\"
      "
    `);
});
