// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { cpSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, expect, it } from "vitest";
import { TEMP_DATA_DIR, TEST_DATA_DIR } from "./paths";
import { runCli } from "./runCli";

const LOCKFILE_DIR = resolve(TEMP_DATA_DIR, "project-dir");

beforeAll(() => {
    const sourceLockfile = resolve(TEST_DATA_DIR, "_pnpm-lock.yaml");
    rmSync(LOCKFILE_DIR, { recursive: true, force: true });
    cpSync(sourceLockfile, resolve(LOCKFILE_DIR, "pnpm-lock.yaml"), { recursive: true });
});

it("reports all duplicates by default", async () => {
    const result = await runCli(LOCKFILE_DIR, undefined);
    expect(result).toMatchInlineSnapshot(`
      {
        "exitCode": 1,
        "output": "Found unexpected duplicate packages:
        - "@changesets/types" # (versions 4.1.0, 6.0.0)
        - "@pnpm/dependency-path" # (versions 5.1.3, 5.1.6)
        - "@pnpm/resolver-base" # (versions 13.0.1, 13.0.4)
        - "@pnpm/types" # (versions 11.1.0, 12.2.0)
        - "@rollup/pluginutils" # (versions 4.2.1, 5.1.0)
        - "@types/node" # (versions 12.20.55, 18.19.41)
        - "agent-base" # (versions 6.0.2, 7.1.1)
        - "ansi-regex" # (versions 5.0.1, 6.0.1)
        - "ansi-styles" # (versions 3.2.1, 4.3.0, 5.2.0, 6.2.1)
        - "argparse" # (versions 1.0.10, 2.0.1)
        - "aria-query" # (versions 5.1.3, 5.3.0)
        - "brace-expansion" # (versions 1.1.11, 2.0.1)
        - "chalk" # (versions 2.4.2, 3.0.0, 4.1.2, 5.3.0)
        - "color-convert" # (versions 1.9.3, 2.0.1)
        - "color-name" # (versions 1.1.3, 1.1.4, 2.0.0)
        - "cross-spawn" # (versions 5.1.0, 7.0.3)
        - "debug" # (versions 3.2.7, 4.3.5)
        - "doctrine" # (versions 2.1.0, 3.0.0)
        - "dom-accessibility-api" # (versions 0.5.16, 0.6.3)
        - "emoji-regex" # (versions 10.3.0, 8.0.0, 9.2.2)
        - "escape-string-regexp" # (versions 1.0.5, 4.0.0)
        - "estree-walker" # (versions 2.0.2, 3.0.3)
        - "execa" # (versions 5.1.1, 8.0.1)
        - "extend-shallow" # (versions 2.0.1, 3.0.2)
        - "find-up" # (versions 4.1.0, 5.0.0)
        - "fs-extra" # (versions 11.2.0, 7.0.1, 8.1.0)
        - "get-stream" # (versions 6.0.1, 8.0.1)
        - "glob" # (versions 10.4.5, 7.2.3)
        - "glob-parent" # (versions 5.1.2, 6.0.2)
        - "globals" # (versions 11.12.0, 13.24.0)
        - "has-flag" # (versions 3.0.0, 4.0.0)
        - "http-proxy-agent" # (versions 5.0.0, 7.0.2)
        - "https-proxy-agent" # (versions 5.0.1, 7.0.5)
        - "human-signals" # (versions 2.1.0, 5.0.0)
        - "iconv-lite" # (versions 0.4.24, 0.6.3)
        - "is-extendable" # (versions 0.1.1, 1.0.1)
        - "is-fullwidth-code-point" # (versions 3.0.0, 4.0.0, 5.0.0)
        - "is-stream" # (versions 2.0.1, 3.0.0)
        - "js-yaml" # (versions 3.14.1, 4.1.0)
        - "jsonfile" # (versions 4.0.0, 6.1.0)
        - "locate-path" # (versions 5.0.0, 6.0.0)
        - "lru-cache" # (versions 10.4.3, 4.1.5, 6.0.0, 7.10.1)
        - "mimic-fn" # (versions 2.1.0, 4.0.0)
        - "minimatch" # (versions 3.1.2, 9.0.5)
        - "ms" # (versions 2.1.2, 2.1.3)
        - "npm-run-path" # (versions 4.0.1, 5.3.0)
        - "onetime" # (versions 5.1.2, 6.0.0)
        - "p-limit" # (versions 2.3.0, 3.1.0)
        - "p-locate" # (versions 4.1.0, 5.0.0)
        - "path-key" # (versions 3.1.1, 4.0.0)
        - "pify" # (versions 2.3.0, 4.0.1)
        - "prettier" # (versions 2.8.8, 3.3.3)
        - "react-is" # (versions 16.13.1, 17.0.2)
        - "regenerator-runtime" # (versions 0.13.11, 0.14.1)
        - "resolve" # (versions 1.22.8, 2.0.0-next.5)
        - "resolve-from" # (versions 4.0.0, 5.0.0)
        - "rimraf" # (versions 3.0.2, 5.0.9)
        - "rrweb-cssom" # (versions 0.6.0, 0.7.1)
        - "safe-execa" # (versions 0.1.2, 0.1.4)
        - "shebang-command" # (versions 1.2.0, 2.0.0)
        - "shebang-regex" # (versions 1.0.0, 3.0.0)
        - "signal-exit" # (versions 3.0.7, 4.1.0)
        - "slice-ansi" # (versions 5.0.0, 7.1.0)
        - "source-map" # (versions 0.5.6, 0.5.7, 0.6.1)
        - "sprintf-js" # (versions 1.0.3, 1.1.3)
        - "string-width" # (versions 4.2.3, 5.1.2, 7.2.0)
        - "strip-ansi" # (versions 6.0.1, 7.1.0)
        - "strip-bom" # (versions 3.0.0, 4.0.0)
        - "strip-final-newline" # (versions 2.0.0, 3.0.0)
        - "stylis" # (versions 4.2.0, 4.3.2)
        - "supports-color" # (versions 5.5.0, 7.2.0)
        - "tslib" # (versions 2.4.0, 2.7.0)
        - "universalify" # (versions 0.1.2, 0.2.0, 2.0.1)
        - "whatwg-mimetype" # (versions 3.0.0, 4.0.0)
        - "which" # (versions 1.3.1, 2.0.2)
        - "wrap-ansi" # (versions 7.0.0, 8.1.0, 9.0.0)
        - "yallist" # (versions 2.1.2, 4.0.0)
        - "yaml" # (versions 1.10.2, 2.4.5)

      To resolve these issues, consider taking one of the following steps:
        - Run 'pnpm dedupe'
        - Investigate why the package is duplicated (try running 'pnpm why -r <package>') and try to resolve the duplication.
        - If the duplication is not a problem, add the package to the allowed list in the configuration file.
      ",
      }
    `);
});

it("supports filtering dev dependencies", async () => {
    const result = await runCli(LOCKFILE_DIR, resolve(TEST_DATA_DIR, "only-prod-dups.yaml"));
    expect(result).toMatchInlineSnapshot(`
      {
        "exitCode": 1,
        "output": "Found unexpected duplicate packages:
        - "ansi-styles" # (versions 3.2.1, 4.3.0, 5.2.0)
        - "chalk" # (versions 2.4.2, 4.1.2)
        - "color-convert" # (versions 1.9.3, 2.0.1)
        - "color-name" # (versions 1.1.3, 1.1.4, 2.0.0)
        - "escape-string-regexp" # (versions 1.0.5, 4.0.0)
        - "extend-shallow" # (versions 2.0.1, 3.0.2)
        - "has-flag" # (versions 3.0.0, 4.0.0)
        - "is-extendable" # (versions 0.1.1, 1.0.1)
        - "react-is" # (versions 16.13.1, 17.0.2)
        - "regenerator-runtime" # (versions 0.13.11, 0.14.1)
        - "source-map" # (versions 0.5.6, 0.5.7, 0.6.1)
        - "stylis" # (versions 4.2.0, 4.3.2)
        - "supports-color" # (versions 5.5.0, 7.2.0)
        - "tslib" # (versions 2.4.0, 2.7.0)

      To resolve these issues, consider taking one of the following steps:
        - Run 'pnpm dedupe'
        - Investigate why the package is duplicated (try running 'pnpm why -r <package>') and try to resolve the duplication.
        - If the duplication is not a problem, add the package to the allowed list in the configuration file.
      ",
      }
    `);
});

it("supports allowing duplicates", async () => {
    const result = await runCli(LOCKFILE_DIR, resolve(TEST_DATA_DIR, "allow-dups.yaml"));
    expect(result).toMatchInlineSnapshot(`
      {
        "exitCode": 0,
        "output": "No unexpected duplicate packages found.
      ",
      }
    `);
});

it("warns when rules are redundant", async () => {
    const result = await runCli(LOCKFILE_DIR, resolve(TEST_DATA_DIR, "redundant-rules.yaml"));
    expect(result).toMatchInlineSnapshot(`
      {
        "exitCode": 0,
        "output": "No unexpected duplicate packages found.

      The following rules did not match any packages. They can be removed from the configuration file:
        - not_needed1
        - not_needed2
      ",
      }
    `);
});
