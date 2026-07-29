// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";
import { useTemporaryPnpmLockfile } from "./helpers";
import { TEMP_PATH } from "./paths";
import { helpMessage, runCli } from "./runCli";

vi.setConfig({
    testTimeout: 30000
});

useTemporaryPnpmLockfile();

it("check help message", async () => {
    const result = await helpMessage();
    expect(result).toMatchSnapshot();
});

it("create license report with production deps only", async () => {
    const outputPath = resolve(TEMP_PATH, "test-prod.html");
    const result = await runCli("license-config.yaml", outputPath);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain(`License report finished successfully`);
    expect(existsSync(outputPath)).toBe(true);
    const html = readFileSync(outputPath, "utf-8");
    expect(html).toContain("simple-project");
    expect(html).toContain("package-a");
    expect(html).not.toContain("package-b");
    expect(html).not.toContain("package-c");
});

it("generated html content matches snapshot", async () => {
    const outputPath = resolve(TEMP_PATH, "test-snapshot.html");
    const result = await runCli("license-config.yaml", outputPath);
    expect(result.exitCode).toBe(0);
    expect(existsSync(outputPath)).toBe(true);
    const html = readFileSync(outputPath, "utf-8");
    await expect(html).toMatchFileSnapshot("__snapshots__/license-report.snapshot.html");
});

it("create license report with dev and additional dependencies", async () => {
    const outputPath = resolve(TEMP_PATH, "test-all.html");
    const result = await runCli("license-config-all.yaml", outputPath);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain(`License report finished successfully`);
    expect(existsSync(outputPath)).toBe(true);
    const html = readFileSync(outputPath, "utf-8");
    expect(html).toContain("simple-project");
    expect(html).toContain("package-a");
    expect(html).toContain("package-b");
    expect(html).toContain("package-c");
});

it("fail on license report with disallowed licenses", async () => {
    const result = await runCli("license-config-missing.yaml");
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain(`License report finished with errors`);
    expect(result.output).toContain(
        `License 'MIT' of dependency 'package-a' (version: 0.0.1) is not allowed by configuration`
    );
    expect(result.output).toContain(
        `License 'Apache-2.0' of dependency 'package-b' (version: 0.0.1) is not allowed by configuration`
    );
});
