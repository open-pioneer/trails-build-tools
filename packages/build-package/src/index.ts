// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import type * as API from "..";
import { createInputModel } from "./model/InputModel";
import { buildPackage } from "./buildPackage";
import { SILENT_LOGGER, createConsoleLogger } from "./utils/Logger";

type Build = typeof API.build;

export const build: Build = async ({
    packageDirectory,
    silent,
    sourceMaps = true,
    strict = true,
    validation = {}
}) => {
    const input = await createInputModel(packageDirectory, {
        requireReadme: validation.requireReadme ?? true,
        requireLicense: validation.requireLicense ?? true,
        requireChangelog: validation.requireChangelog ?? true
    });
    const outputDirectory = resolve(input.packageDirectory, "dist");
    const logger = silent ? SILENT_LOGGER : createConsoleLogger();
    await buildPackage({
        input,
        outputDirectory,
        sourceMaps,
        strict,
        clean: true,
        logger
    });
};
