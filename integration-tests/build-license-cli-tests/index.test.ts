// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { expect, it, vi } from "vitest";
import { helpMessage, runCli } from "./runCli";
import { useTemporaryPnpmLockfile } from "./helpers";

vi.setConfig({
    testTimeout: 20000
});

useTemporaryPnpmLockfile();

it("check help message", async () => {
    const result = await helpMessage();
    expect(result).toMatchSnapshot();
});

it("create license report successfully", async () => {
    const result = await runCli();
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain(`License report finished successfully`);
});

it("fail on license report with missing deps", async () => {
    const result = await runCli(true);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain(`License report finished with errors`);
    expect(result.output).toContain(
        `License 'MIT' of dependency 'package-a' (version: 0.0.1) is not allowed by configuration`
    );
    expect(result.output).toContain(
        `License 'Apache-2.0' of dependency 'package-b' (version: 0.0.1) is not allowed by configuration`
    );
});
