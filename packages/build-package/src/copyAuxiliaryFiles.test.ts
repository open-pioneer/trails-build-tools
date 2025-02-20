// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { CopyAuxiliaryFilesOptions, copyAuxiliaryFiles } from "./copyAuxiliaryFiles";
import { createMemoryLogger } from "./utils/Logger";
import { ValidationReporter } from "./utils/ValidationReporter";
import { TEMP_DATA_DIR, TEST_DATA_DIR } from "./testing/paths";
import { resolve } from "node:path";
import { cleanDir, readText } from "./testing/io";

describe("copyAuxiliaryFiles", function () {
    it("copies all supported auxiliary files", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "project-with-aux-files");
        const outputDirectory = resolve(TEMP_DATA_DIR, "project-with-aux-files");

        const { logger, options } = testDefaults();
        await cleanDir(outputDirectory);
        await copyAuxiliaryFiles({
            packageDirectory,
            outputDirectory,
            ...options
        });

        expect(readText(resolve(outputDirectory, "CHANGELOG"))).toMatchInlineSnapshot(`
          "Changelog
          "
        `);
        expect(readText(resolve(outputDirectory, "LICENSE.txt"))).toMatchInlineSnapshot(`
          "License
          "
        `);
        expect(readText(resolve(outputDirectory, "README.md"))).toMatchInlineSnapshot(`
          "Readme
          "
        `);
        expect(readText(resolve(outputDirectory, "NOTICE"))).toMatchInlineSnapshot(`
          "Notice
          "
        `);
        expect(logger.messages).toHaveLength(0);
    });

    it("warns when required files are missing", async function () {
        const packageDirectory = resolve(TEST_DATA_DIR, "empty-project");
        const outputDirectory = resolve(TEMP_DATA_DIR, "empty-project");

        const { logger, options } = testDefaults();
        await copyAuxiliaryFiles({
            packageDirectory,
            outputDirectory,
            ...options
        });

        expect(() => options.reporter.check()).toThrowErrorMatchingInlineSnapshot(
            `[Error: Aborting due to validation errors (strict validation is enabled).]`
        );

        const validateMessage = (index: number, mustMatch: RegExp, name: string) => {
            const message = logger.messages[index];
            if (!message) {
                throw new Error(`Expected a message at index ${index}`);
            }

            expect(message.type, `Validation for '${name}'`).toEqual("error");
            expect(message.args[0], `Validation for '${name}'`).toMatch(mustMatch);
        };
        validateMessage(0, /LICENSE/, "license");
        validateMessage(1, /README/, "readme");
        validateMessage(2, /CHANGELOG/, "changelog");
    });
});

function testDefaults() {
    const logger = createMemoryLogger();
    const options = {
        reporter: new ValidationReporter(logger, true),
        validation: {
            requireChangelog: true,
            requireLicense: true,
            requireReadme: true
        }
    } satisfies Partial<CopyAuxiliaryFilesOptions>;
    return { logger, options };
}
