// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import { loadI18nFile } from "../metadata/parseI18nYaml";
import { generateI18nIndex, generateI18nMessages } from "./generateI18n";
import { describe, it, expect } from "vitest";
import { TEST_DATA_DIR } from "../utils/testUtils";

describe("generateI18n", function () {
    it("should generate an i18n index module", function () {
        const generatedIndex = generateI18nIndex("test-package-directory", [
            "de",
            "en",
            "de-simple"
        ]);
        expect(generatedIndex).toMatchInlineSnapshot(`
          "export const locales = [\\"de\\", \\"en\\", \\"de-simple\\"];
          export function loadMessages(locale) {
            switch (locale) {
              case \\"de\\":
                return import(\\"\\\\0open-pioneer-app?open-pioneer-i18n&locale=de&pkg=test-package-directory\\").then(mod => mod.default);
              case \\"en\\":
                return import(\\"\\\\0open-pioneer-app?open-pioneer-i18n&locale=en&pkg=test-package-directory\\").then(mod => mod.default);
              case \\"de-simple\\":
                return import(\\"\\\\0open-pioneer-app?open-pioneer-i18n&locale=de-simple&pkg=test-package-directory\\").then(mod => mod.default);
            }
            throw new Error(\`Unsupported locale: '\${locale}'\`);
          }"
        `);
    });

    it("should generate an i18n messages module", async function () {
        const generatedMessages = await generateI18nMessages({
            locale: "de",
            appName: "app-name",
            packages: [
                {
                    name: "package-foo",
                    i18nPaths: new Map([
                        ["de", resolve(TEST_DATA_DIR, "codegen-i18n-yaml/package-foo.yaml")]
                    ])
                },
                {
                    name: "package-bar",
                    i18nPaths: new Map([
                        ["de", resolve(TEST_DATA_DIR, "codegen-i18n-yaml/package-bar.yaml")],
                        ["en", "/does/not/exist.yaml"] // not an error; only read "de"
                    ])
                }
            ],
            loadI18n(path) {
                return loadI18nFile(path);
            }
        });

        expect(generatedMessages).toMatchInlineSnapshot(`
          "const messages = JSON.parse(\\"{\\\\\\"package-foo\\\\\\":{\\\\\\"from-foo.greeting\\\\\\":\\\\\\"Hello World!\\\\\\\\n\\\\\\"},\\\\\\"package-bar\\\\\\":{\\\\\\"from-bar\\\\\\":\\\\\\"Hello from bar\\\\\\"}}\\");
          export default messages;"
        `);
    });

    it("should generate an i18n messages module with overrides from app", async function () {
        const generatedMessages = await generateI18nMessages({
            locale: "de",
            appName: "app",
            packages: [
                {
                    name: "package-foo",
                    i18nPaths: new Map([
                        ["de", resolve(TEST_DATA_DIR, "codegen-i18n-yaml/package-foo.yaml")]
                    ])
                },
                {
                    name: "app",
                    i18nPaths: new Map([
                        ["de", resolve(TEST_DATA_DIR, "codegen-i18n-yaml/app.yaml")]
                    ])
                }
            ],
            loadI18n(path) {
                return loadI18nFile(path);
            }
        });
        expect(generatedMessages).toMatchInlineSnapshot(`
          "const messages = JSON.parse(\\"{\\\\\\"package-foo\\\\\\":{\\\\\\"from-foo.greeting\\\\\\":\\\\\\"Changed from app\\\\\\"},\\\\\\"app\\\\\\":{}}\\");
          export default messages;"
        `);
    });
});
