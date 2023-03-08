// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { assert } from "chai";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadI18nFile } from "../metadata/parseI18nYaml";
import { GENERATE_SNAPSHOTS, TEST_DATA } from "../utils/testUtils";
import { generateI18nIndex, generateI18nMessages } from "./generateI18n";

describe("generateI18n", function () {
    it("should generate an i18n index module", function () {
        const testDataFile = resolve(TEST_DATA, "codegen-i18n-index.js");
        const generatedIndex = generateI18nIndex("test-package-directory", [
            "de",
            "en",
            "de-simple"
        ]);

        if (GENERATE_SNAPSHOTS) {
            writeFileSync(testDataFile, generatedIndex, "utf-8");
        }

        const expected = readFileSync(testDataFile, "utf-8").trim();
        assert.equal(generatedIndex, expected);
    });

    it("should generate an i18n messages module", async function () {
        const testDataFile = resolve(TEST_DATA, "codegen-i18n-messages.js");
        const generatedMessages = await generateI18nMessages({
            locale: "de",
            appName: "app-name",
            packages: [
                {
                    name: "package-foo",
                    i18nPaths: new Map([
                        ["de", resolve(TEST_DATA, "codegen-i18n-yaml/package-foo.yaml")]
                    ])
                },
                {
                    name: "package-bar",
                    i18nPaths: new Map([
                        ["de", resolve(TEST_DATA, "codegen-i18n-yaml/package-bar.yaml")],
                        ["en", "/does/not/exist.yaml"] // not an error; only read "de"
                    ])
                }
            ],
            loadI18n(path) {
                return loadI18nFile(path);
            }
        });

        if (GENERATE_SNAPSHOTS) {
            writeFileSync(testDataFile, generatedMessages, "utf-8");
        }

        const expected = readFileSync(testDataFile, "utf-8").trim();
        assert.equal(generatedMessages, expected);
    });

    it("should generate an i18n messages module with overrides from app", async function () {
        const testDataFile = resolve(TEST_DATA, "codegen-i18n-messages-override.js");
        const generatedMessages = await generateI18nMessages({
            locale: "de",
            appName: "app",
            packages: [
                {
                    name: "package-foo",
                    i18nPaths: new Map([
                        ["de", resolve(TEST_DATA, "codegen-i18n-yaml/package-foo.yaml")]
                    ])
                },
                {
                    name: "app",
                    i18nPaths: new Map([["de", resolve(TEST_DATA, "codegen-i18n-yaml/app.yaml")]])
                }
            ],
            loadI18n(path) {
                return loadI18nFile(path);
            }
        });

        if (GENERATE_SNAPSHOTS) {
            writeFileSync(testDataFile, generatedMessages, "utf-8");
        }

        const expected = readFileSync(testDataFile, "utf-8").trim();
        assert.equal(generatedMessages, expected);
    });
});
