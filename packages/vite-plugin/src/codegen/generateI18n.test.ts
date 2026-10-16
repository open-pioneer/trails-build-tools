// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadI18nFile } from "../metadata/parseI18nYaml";
import { TEST_DATA_DIR } from "../utils/testUtils";
import { collectI18nMessages, generateI18nIndex, generateI18nMessages } from "./generateI18n";

describe("generateI18n", function () {
    it("should generate an i18n index module", function () {
        const generatedIndex = generateI18nIndex("test-package-directory", [
            "de",
            "en",
            "de-simple"
        ]);
        expect(generatedIndex).toMatchInlineSnapshot(`
          "// Locales supported by the application
          export const locales = ["de", "en", "de-simple"];

          // Lazily loads the messages for the given locale
          export function loadMessages(locale) {
              switch (locale) {
                  case "de":
                      return import("test-package-directory/@@open-pioneer-app?open-pioneer-i18n&locale=de").then((mod) => mod.default);

                  case "en":
                      return import("test-package-directory/@@open-pioneer-app?open-pioneer-i18n&locale=en").then((mod) => mod.default);

                  case "de-simple":
                      return import("test-package-directory/@@open-pioneer-app?open-pioneer-i18n&locale=de-simple").then((mod) => mod.default);
              }

              throw new Error(\`Unsupported locale: '\${locale}'\`);
          }"
        `);
    });

    it("should generate an i18n messages module", async function () {
        const generatedMessages = await generateI18nMessages({
            mode: "app",
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
            loadI18n(_pkg, path) {
                return loadI18nFile(path);
            }
        });

        expect(generatedMessages).toMatchInlineSnapshot(`
          "// Messages for locale 'de', keyed by package name and message id
          const messages = JSON.parse("{\\"package-foo\\":{\\"from-foo.greeting\\":\\"Hello World!\\\\n\\"},\\"package-bar\\":{\\"from-bar\\":\\"Hello from bar\\"}}");

          export default messages;"
        `);
    });

    it("should generate an i18n messages module with overrides from app", async function () {
        const generatedMessages = await generateI18nMessages({
            mode: "app",
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
            loadI18n(_pkg, path) {
                return loadI18nFile(path);
            }
        });
        expect(generatedMessages).toMatchInlineSnapshot(`
          "// Messages for locale 'de', keyed by package name and message id
          const messages = JSON.parse("{\\"package-foo\\":{\\"from-foo.greeting\\":\\"Changed from app\\"},\\"app\\":{}}");

          export default messages;"
        `);
    });

    it("fails in app mode when a package does not provide the requested locale", async function () {
        await expect(() =>
            collectI18nMessages({
                mode: "app",
                locale: "en",
                appName: "app",
                packages: [
                    {
                        name: "package-foo",
                        i18nPaths: new Map([
                            ["de", resolve(TEST_DATA_DIR, "codegen-i18n-yaml/package-foo.yaml")]
                        ])
                    }
                ],
                loadI18n(_pkg, path) {
                    return loadI18nFile(path);
                }
            })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
            `[Error: Package 'package-foo' does not support locale 'en'. Either update the package or add messages from the app via 'overrides'.]`
        );
    });

    it("skips packages without the requested locale in test mode", async function () {
        const messages = await collectI18nMessages({
            mode: "test",
            locale: "en",
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
                        ["en", resolve(TEST_DATA_DIR, "codegen-i18n-yaml/package-bar.yaml")]
                    ])
                }
            ],
            loadI18n(_pkg, path) {
                return loadI18nFile(path);
            }
        });
        expect(messages).toEqual({
            "package-bar": {
                "from-bar": "Hello from bar"
            }
        });
    });
});
