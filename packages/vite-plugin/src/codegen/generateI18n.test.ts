// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { assert } from "chai";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { GENERATE_SNAPSHOTS, TEST_DATA } from "../utils/testUtils";
import { generateI18nIndex, generateI18nMessages } from "./generateI18n";

describe("generateI18n", function () {
    it("should generate an i18n index module", function () {
        const testDataFile = resolve(TEST_DATA, "codegen-i18n-index.js");
        const generatedIndex = generateI18nIndex("my-importer.ts", ["de", "en", "de-simple"]);

        if (GENERATE_SNAPSHOTS) {
            writeFileSync(testDataFile, generatedIndex, "utf-8");
        }

        const expected = readFileSync(testDataFile, "utf-8").trim();
        assert.equal(generatedIndex, expected);
    });

    it("should generate an i18n messages module", async function () {
        const testDataFile = resolve(TEST_DATA, "codegen-i18n-messages.js");
        const generatedMessages = await generateI18nMessages(
            {
                addWatchFile() {
                    return;
                }
            },
            "de",
            "app-name",
            [
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
            ]
        );

        if (GENERATE_SNAPSHOTS) {
            writeFileSync(testDataFile, generatedMessages, "utf-8");
        }

        const expected = readFileSync(testDataFile, "utf-8").trim();
        assert.equal(generatedMessages, expected);
    });

    it("should generate an i18n messages module with overrides from app", async function () {
        const testDataFile = resolve(TEST_DATA, "codegen-i18n-messages-override.js");
        const generatedMessages = await generateI18nMessages(
            {
                addWatchFile() {
                    return;
                }
            },
            "de",
            "app",
            [
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
            ]
        );

        if (GENERATE_SNAPSHOTS) {
            writeFileSync(testDataFile, generatedMessages, "utf-8");
        }

        const expected = readFileSync(testDataFile, "utf-8").trim();
        assert.equal(generatedMessages, expected);
    });
});
