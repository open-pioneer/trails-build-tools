// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { BuildConfig } from "@open-pioneer/build-support";
import { pathToFileURL } from "node:url";
import { verifyBuildConfig } from "./verifyBuildConfig";
import { existsSync } from "node:fs";

let requestId = 0;

export async function loadBuildConfig(path: string): Promise<BuildConfig> {
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
}
