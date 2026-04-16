// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { expect, it, vi } from "vitest";
import { createLicenseFile } from "./create-license-report";
import { expectError } from "./testing/helpers";
import { resolve } from "node:path";
import { TEST_DATA_DIR } from "./testing/paths";

vi.setConfig({
    testTimeout: 20000
});

it("expect create license to fail with false config", async () => {
    const error = await expectError(() =>
        createLicenseFile({
            dev: false,
            log: false,
            configPath: "",
            packageJsonPath: "",
            outputHtmlPath: ""
        })
    );
    expect(error.message).toMatch(/Failed to read license config from/);
});

it("expect create license to be created", async () => {
    // const packageDirectory = resolve(TEST_DATA_DIR, "simple-project");
    //
    // await createLicenseFile({
    //     dev: false,
    //     log: true,
    //     configPath: resolve(packageDirectory, "license-config.yaml"),
    //     packageJsonPath: resolve(packageDirectory, "package.json"),
    //     outputHtmlPath: resolve(packageDirectory, "test.html")
    // });
});
