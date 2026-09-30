// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { resolve } from "node:path";
import { createMemoryLogger } from "@open-pioneer/cli-common";
import { expect, it } from "vitest";
import { PnpmLicenseProject } from "./pnpmLicenseReport";
import { LicenseConfig, readLicenseConfig } from "./readLicenseConfig";
import { PROJECT_DIR } from "./testing/paths";
import { verifyLicenses } from "./verifyLicenses";

it("reads the license text of an allowed dependency", () => {
    const { result } = verify(readConfig("license-config.yaml"), mockPnpmProjects());
    expect(result.ok).toBe(true);
    expect(result.items).toMatchInlineSnapshot(`
      [
        {
          "license": "MIT",
          "licenseText": "The MIT License (MIT)
      TEST
      ",
          "name": "package-a",
          "noticeText": "",
          "version": "0.0.1",
        },
      ]
    `);
});

it("reports a license that is not allowed", () => {
    const { result, warnings } = verify(
        readConfig("license-config-missing.yaml"),
        mockPnpmProjects()
    );
    expect(result.ok).toBe(false);
    expect(warnings).toContain(
        "License 'MIT' of dependency 'package-a' (version: 0.0.1) is not allowed by configuration."
    );
});

it("reports an ambiguous OR expression with instructions", () => {
    const { result, warnings } = verify(
        readConfig("license-config.yaml"),
        mockPnpmProjects("(GPL-3.0-only OR MIT)")
    );
    expect(result.ok).toBe(false);
    expect(warnings[0]).toContain(
        "License '(GPL-3.0-only OR MIT)' of dependency 'package-a' (version: 0.0.1) combines multiple licenses with 'OR'."
    );
});

it("uses the license from overrideLicenses instead of the detected one", () => {
    const licenseConfig = readConfig("license-config.yaml");
    licenseConfig.overrideLicenses = [{ name: "package-a", version: "0.0.1", license: "MIT" }];
    const { result } = verify(licenseConfig, mockPnpmProjects("(GPL-3.0-only OR ISC)"));
    expect(result.ok).toBe(true);
    expect(result.items[0]?.license).toBe("MIT");
});

it("warns about overrides that did not match any dependency", () => {
    const licenseConfig = readConfig("license-config.yaml");
    licenseConfig.overrideLicenses = [{ name: "package-a", version: "9.9.9", license: "MIT" }];
    const { result, warnings } = verify(licenseConfig, mockPnpmProjects());
    expect(result.ok).toBe(true);
    expect(warnings).toContain(
        "License override for dependency 'package-a' (version: 9.9.9) was not used, it should either be updated or removed."
    );
});

it("adds additionalLicenses with their custom license files", () => {
    const { result } = verify(readConfig("license-config-all.yaml"), mockPnpmProjects());
    expect(result.ok).toBe(true);
    expect(result.items.map((item) => item.name)).toEqual(["package-a", "package-c"]);
    expect(result.items[1]?.licenseText).toContain("Apache-2.0 License");
});

it("reports a dependency without a license text", () => {
    const projects = mockPnpmProjects();
    projects[0]!.paths = [resolve(PROJECT_DIR, "licenses")];
    const { result, warnings } = verify(readConfig("license-config.yaml"), projects);
    expect(result.ok).toBe(false);
    expect(warnings[0]).toContain("Failed to detect license text of dependency 'package-a'");
});

function readConfig(fileName: string): LicenseConfig {
    return readLicenseConfig(resolve(PROJECT_DIR, fileName));
}

function verify(licenseConfig: LicenseConfig, projects: PnpmLicenseProject[]) {
    const logger = createMemoryLogger();
    const result = verifyLicenses({
        projects,
        config: licenseConfig,
        configDirectory: PROJECT_DIR,
        logger
    });
    const warnings = logger.messages
        .filter((message) => message.type === "warn")
        .map((message) => message.args.join(" "));
    return { result, warnings };
}

function mockPnpmProjects(license: string = "MIT"): PnpmLicenseProject[] {
    const packagePath = resolve(
        PROJECT_DIR,
        "node_modules/.pnpm/package-a@0.0.1/node_modules/package-a"
    );
    return [
        {
            name: "package-a",
            versions: ["0.0.1"],
            paths: [packagePath],
            license
        }
    ];
}
