// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { pathToFileURL } from "node:url";
import { verifyBuildConfig } from "./verifyBuildConfig";
import { existsSync } from "node:fs";
import type * as API from "../../types";

type LoadBuildConfig = typeof API.loadBuildConfig;

export const loadBuildConfig: LoadBuildConfig = async function loadBuildConfig(path) {
    if (!existsSync(path)) {
        throw new Error(`The configuration file at ${path} does not exist`);
    }

    const fileURL = pathToFileURL(path);
    const moduleId = `${fileURL}?ts=${new Date().getTime()}`;
    const importedModule = (await import(moduleId)) as Record<string, unknown>;
    if (!importedModule || !importedModule.default) {
        throw new Error(`The configuration file at ${path} must provide a default export`);
    }

    const config = importedModule.default;
    const buildConfigResult = await verifyBuildConfig(config);
    if (buildConfigResult.type === "success") {
        return buildConfigResult.value;
    } else {
        throw new Error(
            `Validation error in configuration file at ${path}. ${buildConfigResult.message}`,
            { cause: buildConfigResult.cause }
        );
    }
};
