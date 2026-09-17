// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, expect, it } from "vitest";
import { findDuplicatePackages } from "./findDuplicates";
import { listPackages, PnpmProject } from "./pnpm";
import { setupPnpmWorkspace } from "./testing/paths";

let projectDir!: string;
beforeAll(() => {
    projectDir = setupPnpmWorkspace("simple-dups", "find-duplicates");
});

it("collects versions from all projects and dependency types", () => {
    const projects: PnpmProject[] = [
        {
            name: "a",
            path: "/a",
            dependencies: {
                foo: {
                    from: "foo",
                    version: "1.0.0",
                    dependencies: {
                        // Nested dependency
                        bar: { from: "bar", version: "1.0.0" }
                    }
                }
            },
            devDependencies: {
                // Aliased dependency: the actual package name is 'foo'
                "foo-alias": { from: "foo", version: "2.0.0" }
            },
            optionalDependencies: {
                bar: { from: "bar", version: "2.0.0" }
            }
        },
        {
            name: "b",
            path: "/b",
            dependencies: {
                // Same version as above (no duplicate), listed without nested dependencies
                foo: { from: "foo", version: "1.0.0" },
                // Workspace packages are ignored
                a: { from: "a", version: "link:../a" },
                // Single version only
                baz: { from: "baz", version: "1.0.0" }
            }
        }
    ];
    const duplicates = findDuplicatePackages(projects);
    expect(duplicates).toMatchInlineSnapshot(`
      Map {
        "bar" => {
          "name": "bar",
          "versions": [
            "1.0.0",
            "2.0.0",
          ],
        },
        "foo" => {
          "name": "foo",
          "versions": [
            "1.0.0",
            "2.0.0",
          ],
        },
      }
    `);
});

it("reports a file dependency next to a registry version of the same package", () => {
    const projects: PnpmProject[] = [
        {
            name: "root",
            path: "/root",
            dependencies: {
                "local-pkg": { from: "local-pkg", version: "file:local-pkg" }
            },
            devDependencies: {
                "local-pkg-from-registry": { from: "local-pkg", version: "1.0.0" }
            }
        }
    ];
    const duplicates = findDuplicatePackages(projects);
    expect(duplicates).toMatchInlineSnapshot(`
      Map {
        "local-pkg" => {
          "name": "local-pkg",
          "versions": [
            "1.0.0",
            "file:local-pkg",
          ],
        },
      }
    `);
});

it("detects duplicate in simple lockfile", async () => {
    const projects = await listPackages(projectDir, false);
    const duplicates = findDuplicatePackages(projects);
    expect(duplicates).toMatchInlineSnapshot(`
      Map {
        "@changesets/types" => {
          "name": "@changesets/types",
          "versions": [
            "4.1.0",
            "6.0.0",
          ],
        },
        "@pnpm/dependency-path" => {
          "name": "@pnpm/dependency-path",
          "versions": [
            "5.1.3",
            "5.1.6",
          ],
        },
        "@pnpm/resolver-base" => {
          "name": "@pnpm/resolver-base",
          "versions": [
            "13.0.1",
            "13.0.4",
          ],
        },
        "@pnpm/types" => {
          "name": "@pnpm/types",
          "versions": [
            "11.1.0",
            "12.2.0",
          ],
        },
        "@rollup/pluginutils" => {
          "name": "@rollup/pluginutils",
          "versions": [
            "4.2.1",
            "5.1.0",
          ],
        },
        "@types/node" => {
          "name": "@types/node",
          "versions": [
            "12.20.55",
            "18.19.41",
          ],
        },
        "agent-base" => {
          "name": "agent-base",
          "versions": [
            "6.0.2",
            "7.1.1",
          ],
        },
        "ansi-regex" => {
          "name": "ansi-regex",
          "versions": [
            "5.0.1",
            "6.0.1",
          ],
        },
        "ansi-styles" => {
          "name": "ansi-styles",
          "versions": [
            "3.2.1",
            "4.3.0",
            "5.2.0",
            "6.2.1",
          ],
        },
        "argparse" => {
          "name": "argparse",
          "versions": [
            "1.0.10",
            "2.0.1",
          ],
        },
        "aria-query" => {
          "name": "aria-query",
          "versions": [
            "5.1.3",
            "5.3.0",
          ],
        },
        "brace-expansion" => {
          "name": "brace-expansion",
          "versions": [
            "1.1.11",
            "2.0.1",
          ],
        },
        "chalk" => {
          "name": "chalk",
          "versions": [
            "2.4.2",
            "3.0.0",
            "4.1.2",
            "5.3.0",
          ],
        },
        "color-convert" => {
          "name": "color-convert",
          "versions": [
            "1.9.3",
            "2.0.1",
          ],
        },
        "color-name" => {
          "name": "color-name",
          "versions": [
            "1.1.3",
            "1.1.4",
            "2.0.0",
          ],
        },
        "cross-spawn" => {
          "name": "cross-spawn",
          "versions": [
            "5.1.0",
            "7.0.3",
          ],
        },
        "debug" => {
          "name": "debug",
          "versions": [
            "3.2.7",
            "4.3.5",
          ],
        },
        "doctrine" => {
          "name": "doctrine",
          "versions": [
            "2.1.0",
            "3.0.0",
          ],
        },
        "dom-accessibility-api" => {
          "name": "dom-accessibility-api",
          "versions": [
            "0.5.16",
            "0.6.3",
          ],
        },
        "emoji-regex" => {
          "name": "emoji-regex",
          "versions": [
            "10.3.0",
            "8.0.0",
            "9.2.2",
          ],
        },
        "escape-string-regexp" => {
          "name": "escape-string-regexp",
          "versions": [
            "1.0.5",
            "4.0.0",
          ],
        },
        "estree-walker" => {
          "name": "estree-walker",
          "versions": [
            "2.0.2",
            "3.0.3",
          ],
        },
        "execa" => {
          "name": "execa",
          "versions": [
            "5.1.1",
            "8.0.1",
          ],
        },
        "extend-shallow" => {
          "name": "extend-shallow",
          "versions": [
            "2.0.1",
            "3.0.2",
          ],
        },
        "find-up" => {
          "name": "find-up",
          "versions": [
            "4.1.0",
            "5.0.0",
          ],
        },
        "fs-extra" => {
          "name": "fs-extra",
          "versions": [
            "11.2.0",
            "7.0.1",
            "8.1.0",
          ],
        },
        "get-stream" => {
          "name": "get-stream",
          "versions": [
            "6.0.1",
            "8.0.1",
          ],
        },
        "glob" => {
          "name": "glob",
          "versions": [
            "10.4.5",
            "7.2.3",
          ],
        },
        "glob-parent" => {
          "name": "glob-parent",
          "versions": [
            "5.1.2",
            "6.0.2",
          ],
        },
        "globals" => {
          "name": "globals",
          "versions": [
            "11.12.0",
            "13.24.0",
          ],
        },
        "has-flag" => {
          "name": "has-flag",
          "versions": [
            "3.0.0",
            "4.0.0",
          ],
        },
        "http-proxy-agent" => {
          "name": "http-proxy-agent",
          "versions": [
            "5.0.0",
            "7.0.2",
          ],
        },
        "https-proxy-agent" => {
          "name": "https-proxy-agent",
          "versions": [
            "5.0.1",
            "7.0.5",
          ],
        },
        "human-signals" => {
          "name": "human-signals",
          "versions": [
            "2.1.0",
            "5.0.0",
          ],
        },
        "iconv-lite" => {
          "name": "iconv-lite",
          "versions": [
            "0.4.24",
            "0.6.3",
          ],
        },
        "is-extendable" => {
          "name": "is-extendable",
          "versions": [
            "0.1.1",
            "1.0.1",
          ],
        },
        "is-fullwidth-code-point" => {
          "name": "is-fullwidth-code-point",
          "versions": [
            "3.0.0",
            "4.0.0",
            "5.0.0",
          ],
        },
        "is-stream" => {
          "name": "is-stream",
          "versions": [
            "2.0.1",
            "3.0.0",
          ],
        },
        "js-yaml" => {
          "name": "js-yaml",
          "versions": [
            "3.14.1",
            "4.1.0",
          ],
        },
        "jsonfile" => {
          "name": "jsonfile",
          "versions": [
            "4.0.0",
            "6.1.0",
          ],
        },
        "locate-path" => {
          "name": "locate-path",
          "versions": [
            "5.0.0",
            "6.0.0",
          ],
        },
        "lru-cache" => {
          "name": "lru-cache",
          "versions": [
            "10.4.3",
            "4.1.5",
            "6.0.0",
            "7.10.1",
          ],
        },
        "mimic-fn" => {
          "name": "mimic-fn",
          "versions": [
            "2.1.0",
            "4.0.0",
          ],
        },
        "minimatch" => {
          "name": "minimatch",
          "versions": [
            "3.1.2",
            "9.0.5",
          ],
        },
        "ms" => {
          "name": "ms",
          "versions": [
            "2.1.2",
            "2.1.3",
          ],
        },
        "npm-run-path" => {
          "name": "npm-run-path",
          "versions": [
            "4.0.1",
            "5.3.0",
          ],
        },
        "onetime" => {
          "name": "onetime",
          "versions": [
            "5.1.2",
            "6.0.0",
          ],
        },
        "p-limit" => {
          "name": "p-limit",
          "versions": [
            "2.3.0",
            "3.1.0",
          ],
        },
        "p-locate" => {
          "name": "p-locate",
          "versions": [
            "4.1.0",
            "5.0.0",
          ],
        },
        "path-key" => {
          "name": "path-key",
          "versions": [
            "3.1.1",
            "4.0.0",
          ],
        },
        "pify" => {
          "name": "pify",
          "versions": [
            "2.3.0",
            "4.0.1",
          ],
        },
        "prettier" => {
          "name": "prettier",
          "versions": [
            "2.8.8",
            "3.3.3",
          ],
        },
        "react-is" => {
          "name": "react-is",
          "versions": [
            "16.13.1",
            "17.0.2",
          ],
        },
        "regenerator-runtime" => {
          "name": "regenerator-runtime",
          "versions": [
            "0.13.11",
            "0.14.1",
          ],
        },
        "resolve" => {
          "name": "resolve",
          "versions": [
            "1.22.8",
            "2.0.0-next.5",
          ],
        },
        "resolve-from" => {
          "name": "resolve-from",
          "versions": [
            "4.0.0",
            "5.0.0",
          ],
        },
        "rimraf" => {
          "name": "rimraf",
          "versions": [
            "3.0.2",
            "5.0.9",
          ],
        },
        "rrweb-cssom" => {
          "name": "rrweb-cssom",
          "versions": [
            "0.6.0",
            "0.7.1",
          ],
        },
        "safe-execa" => {
          "name": "safe-execa",
          "versions": [
            "0.1.2",
            "0.1.4",
          ],
        },
        "shebang-command" => {
          "name": "shebang-command",
          "versions": [
            "1.2.0",
            "2.0.0",
          ],
        },
        "shebang-regex" => {
          "name": "shebang-regex",
          "versions": [
            "1.0.0",
            "3.0.0",
          ],
        },
        "signal-exit" => {
          "name": "signal-exit",
          "versions": [
            "3.0.7",
            "4.1.0",
          ],
        },
        "slice-ansi" => {
          "name": "slice-ansi",
          "versions": [
            "5.0.0",
            "7.1.0",
          ],
        },
        "source-map" => {
          "name": "source-map",
          "versions": [
            "0.5.6",
            "0.5.7",
            "0.6.1",
          ],
        },
        "sprintf-js" => {
          "name": "sprintf-js",
          "versions": [
            "1.0.3",
            "1.1.3",
          ],
        },
        "string-width" => {
          "name": "string-width",
          "versions": [
            "4.2.3",
            "5.1.2",
            "7.2.0",
          ],
        },
        "strip-ansi" => {
          "name": "strip-ansi",
          "versions": [
            "6.0.1",
            "7.1.0",
          ],
        },
        "strip-bom" => {
          "name": "strip-bom",
          "versions": [
            "3.0.0",
            "4.0.0",
          ],
        },
        "strip-final-newline" => {
          "name": "strip-final-newline",
          "versions": [
            "2.0.0",
            "3.0.0",
          ],
        },
        "stylis" => {
          "name": "stylis",
          "versions": [
            "4.2.0",
            "4.3.2",
          ],
        },
        "supports-color" => {
          "name": "supports-color",
          "versions": [
            "5.5.0",
            "7.2.0",
          ],
        },
        "tslib" => {
          "name": "tslib",
          "versions": [
            "2.4.0",
            "2.7.0",
          ],
        },
        "universalify" => {
          "name": "universalify",
          "versions": [
            "0.1.2",
            "0.2.0",
            "2.0.1",
          ],
        },
        "whatwg-mimetype" => {
          "name": "whatwg-mimetype",
          "versions": [
            "3.0.0",
            "4.0.0",
          ],
        },
        "which" => {
          "name": "which",
          "versions": [
            "1.3.1",
            "2.0.2",
          ],
        },
        "wrap-ansi" => {
          "name": "wrap-ansi",
          "versions": [
            "7.0.0",
            "8.1.0",
            "9.0.0",
          ],
        },
        "yallist" => {
          "name": "yallist",
          "versions": [
            "2.1.2",
            "4.0.0",
          ],
        },
        "yaml" => {
          "name": "yaml",
          "versions": [
            "1.10.2",
            "2.4.5",
          ],
        },
      }
    `);
});

it("can filter devDependencies", async () => {
    const projects = await listPackages(projectDir, true);
    const duplicates = findDuplicatePackages(projects);
    expect(duplicates).toMatchInlineSnapshot(`
      Map {
        "ansi-styles" => {
          "name": "ansi-styles",
          "versions": [
            "3.2.1",
            "4.3.0",
            "5.2.0",
          ],
        },
        "chalk" => {
          "name": "chalk",
          "versions": [
            "2.4.2",
            "4.1.2",
          ],
        },
        "color-convert" => {
          "name": "color-convert",
          "versions": [
            "1.9.3",
            "2.0.1",
          ],
        },
        "color-name" => {
          "name": "color-name",
          "versions": [
            "1.1.3",
            "1.1.4",
            "2.0.0",
          ],
        },
        "escape-string-regexp" => {
          "name": "escape-string-regexp",
          "versions": [
            "1.0.5",
            "4.0.0",
          ],
        },
        "extend-shallow" => {
          "name": "extend-shallow",
          "versions": [
            "2.0.1",
            "3.0.2",
          ],
        },
        "has-flag" => {
          "name": "has-flag",
          "versions": [
            "3.0.0",
            "4.0.0",
          ],
        },
        "is-extendable" => {
          "name": "is-extendable",
          "versions": [
            "0.1.1",
            "1.0.1",
          ],
        },
        "react-is" => {
          "name": "react-is",
          "versions": [
            "16.13.1",
            "17.0.2",
          ],
        },
        "regenerator-runtime" => {
          "name": "regenerator-runtime",
          "versions": [
            "0.13.11",
            "0.14.1",
          ],
        },
        "source-map" => {
          "name": "source-map",
          "versions": [
            "0.5.6",
            "0.5.7",
            "0.6.1",
          ],
        },
        "stylis" => {
          "name": "stylis",
          "versions": [
            "4.2.0",
            "4.3.2",
          ],
        },
        "supports-color" => {
          "name": "supports-color",
          "versions": [
            "5.5.0",
            "7.2.0",
          ],
        },
        "tslib" => {
          "name": "tslib",
          "versions": [
            "2.4.0",
            "2.7.0",
          ],
        },
      }
    `);
});
