// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { pathToFileURL } from "node:url";
import { verifyBuildConfig } from "./verifyBuildConfig";
import { existsSync } from "node:fs";
import type * as API from "../../types";

type LoadBuildConfig = typeof API.loadBuildConfig;

let requestId = 0;

export const loadBuildConfig: LoadBuildConfig = async function loadBuildConfig(path) {
    if (!existsSync(path)) {
        throw new Error(`The configuration file at ${path} does not exist`);
    }

    const fileURL = pathToFileURL(path);
    const importedModule = (await import(`${fileURL}?id=${++requestId}`)) as Record<
        string,
        unknown
    >;
    if (!importedModule || !importedModule.default) {
        throw new Error(`The configuration file at ${path} must provide a default export`);
    }

    const config = importedModule.default;
    try {
        return await verifyBuildConfig(config);
    } catch (e) {
        throw new Error(`Validation error in configuration file at ${path}`, { cause: e });
    }
};
