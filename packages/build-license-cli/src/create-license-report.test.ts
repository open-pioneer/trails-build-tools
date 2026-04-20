// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it, onTestFailed, vi } from "vitest";
import { TEMP_PATH } from "./testing/paths";
import { createLicenseFile } from "./create-license-report";
import { useTemporaryPnpmLockfile } from "./testing/helpers";

vi.setConfig({
    testTimeout: 30000
});
useTemporaryPnpmLockfile();

it("expect to create a license html without dev and additional deps", async () => {
    const config = resolve(TEMP_PATH, "license-config.yaml");
    const htmlOutput = resolve(TEMP_PATH, "test-a.html");

    await createLicenseFile({
        dev: false,
        ignoreWorkspace: true,
        log: false,
        outputHtmlPath: htmlOutput,
        workingDir: TEMP_PATH,
        configPath: config
    });

    expect(existsSync(htmlOutput)).toBe(true);
    const html = readFileSync(htmlOutput, "utf-8");
    expect(html).toContain("simple-project");
    expect(html).toContain("package-a");
    expect(html).not.toContain("package-b");
    expect(html).not.toContain("package-c");
});

it("expect to fail with a missing license", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const config = resolve(TEMP_PATH, "license-config-missing.yaml");
    const htmlOutput = resolve(TEMP_PATH, "test-a.html");

    try {
        await createLicenseFile({
            dev: false,
            ignoreWorkspace: true,
            log: true,
            outputHtmlPath: htmlOutput,
            workingDir: TEMP_PATH,
            configPath: config
        });
    } catch (e) {
        expect(e).toBeDefined();
        expect(warnSpy).toHaveBeenCalled();
        onTestFailed(() => console.log(warnSpy.mock.calls));
        expect(
            warnSpy.mock.calls
                .flat()
                .some((arg) =>
                    String(arg).includes(
                        "License 'MIT' of dependency 'package-a' (version: 0.0.1) is not allowed by configuration."
                    )
                )
        ).toBe(true);
    }
});

it("expect to create a license html with dev but without additional dependencies", async () => {
    const config = resolve(TEMP_PATH, "license-config.yaml");
    const htmlOutput = resolve(TEMP_PATH, "test-abc.html");

    await createLicenseFile({
        dev: true,
        ignoreWorkspace: true,
        log: false,
        outputHtmlPath: htmlOutput,
        workingDir: TEMP_PATH,
        configPath: config
    });

    expect(existsSync(htmlOutput)).toBe(true);
    const html = readFileSync(htmlOutput, "utf-8");
    expect(html).toContain("simple-project");
    expect(html).toContain("package-a");
    expect(html).toContain("package-b");
    expect(html).not.toContain("package-c");
});

it("expect to create a license html with dev and additional dependencies", async () => {
    const config = resolve(TEMP_PATH, "license-config-all.yaml");
    const htmlOutput = resolve(TEMP_PATH, "test-abc.html");

    await createLicenseFile({
        dev: true,
        ignoreWorkspace: true,
        log: false,
        outputHtmlPath: htmlOutput,
        workingDir: TEMP_PATH,
        configPath: config
    });

    expect(existsSync(htmlOutput)).toBe(true);
    const html = readFileSync(htmlOutput, "utf-8");
    expect(html).toContain("simple-project");
    expect(html).toContain("package-a");
    expect(html).toContain("package-b");
    expect(html).toContain("package-c");
});
