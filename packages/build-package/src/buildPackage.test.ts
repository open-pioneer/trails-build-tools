// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createMemoryLogger } from "@open-pioneer/cli-common";
import { expect, it } from "vitest";
import { buildPackage } from "./buildPackage";
import { createInputModel } from "./model/InputModel";
import { resolveOptions } from "./model/Options";
import { cleanDir, readText } from "./testing/io";
import { TEST_DATA_DIR, tempDirForTest } from "./testing/paths";

const TEMP_DATA_DIR = tempDirForTest(import.meta.url);

it("copies i18n files if configured in build.config.js", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "project-with-i18n");
    const outputDirectory = resolve(TEMP_DATA_DIR, "project-with-i18n");
    await cleanDir(outputDirectory);

    const resolvedOptions = await resolveOptions(packageDirectory, packageDirectory, {
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
          hello: "Hallo"
      "
    `);
    expect(readText(resolve(outputDirectory, "i18n/de-simple.yaml"))).toMatchInlineSnapshot(`
      "messages:
          hello: "Hallo"
      "
    `);
    expect(readText(resolve(outputDirectory, "i18n/en.yaml"))).toMatchInlineSnapshot(`
      "messages:
          hello: "Hello"
      "
    `);
});

it("builds a package with public assets", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "project-with-public-assets");
    const outputDirectory = resolve(TEMP_DATA_DIR, "project-with-public-assets");
    await cleanDir(outputDirectory);

    const resolvedOptions = await resolveOptions(packageDirectory, packageDirectory, {
        strict: false,
        validation: false,
        types: false,
        packageFormatTarget: "1.2"
    });

    const logger = createMemoryLogger();
    await buildPackage({
        input: await createInputModel(packageDirectory),
        options: { ...resolvedOptions, outputDirectory },
        logger
    });

    expect(readText(resolve(outputDirectory, "public/nested/file.txt"))).toBe("nested file\n");
    expect(existsSync(resolve(outputDirectory, "public/.hidden"))).toBe(false);
    expect(existsSync(resolve(outputDirectory, "node_modules"))).toBe(false);

    const packageJson = JSON.parse(readText(resolve(outputDirectory, "package.json")));
    expect(packageJson.openPioneerFramework.publicAssets).toMatchInlineSnapshot(`
      [
        {
          "dest": "",
          "src": "public",
          "type": "local",
        },
        {
          "dest": "third-party-lib",
          "packageName": "third-party-lib",
          "src": "cdn",
          "type": "dependency",
        },
      ]
    `);
});

it("throws if i18n files are missing", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "project-with-missing-i18n-files");
    const outputDirectory = resolve(TEMP_DATA_DIR, "project-with-missing-i18n-files");
    await cleanDir(outputDirectory);

    const resolvedOptions = await resolveOptions(packageDirectory, packageDirectory, {
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
    ).rejects.toThrow(/I18n file does not exist/);
});
