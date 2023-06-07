// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from "vitest";
import { TEMP_DATA_DIR, TEST_DATA_DIR } from "./testing/paths";
import { resolve } from "node:path";
import { cleanDir, readText } from "./testing/io";
import { buildPackage } from "./buildPackage";
import { createMemoryLogger } from "./utils/Logger";
import { createInputModel } from "./model/InputModel";
import { resolveOptions } from "./model/Options";

it("copies i18n files if configured in build.config.js", async function () {
    const packageDirectory = resolve(TEST_DATA_DIR, "project-with-i18n");
    const outputDirectory = resolve(TEMP_DATA_DIR, "project-with-i18n");
    await cleanDir(outputDirectory);

    const resolvedOptions = await resolveOptions(packageDirectory, {
        strict: false,
        validation: {
            requireChangelog: false,
            requireLicense: false,
            requireReadme: false
        },
        types: false
    });

    const logger = createMemoryLogger();
    await buildPackage({
        input: await createInputModel(packageDirectory),
        options: { ...resolvedOptions, outputDirectory },
        logger
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

it("throws if i18n files are missing", async function () {
    const packageDirectory = resolve(TEST_DATA_DIR, "project-with-missing-i18n-files");
    const outputDirectory = resolve(TEMP_DATA_DIR, "project-with-missing-i18n-files");
    await cleanDir(outputDirectory);

    const resolvedOptions = await resolveOptions(packageDirectory, {
        strict: false,
        validation: {
            requireChangelog: false,
            requireLicense: false,
            requireReadme: false
        },
        types: false
    });

    const logger = createMemoryLogger();
    await expect(async () =>
        buildPackage({
            input: await createInputModel(packageDirectory),
            options: { ...resolvedOptions, outputDirectory },
            logger
        })
    ).rejects.toMatch(/I18n file does not exist/);
});
