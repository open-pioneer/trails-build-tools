// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import type * as API from "..";
import { createInputModel } from "./InputModel";
import { buildPackage } from "./buildPackage";
import { SILENT_LOGGER, createConsoleLogger } from "./Logger";

type Build = typeof API.build;

export const build: Build = async ({ packageDirectory, silent }) => {
    const outputDirectory = resolve(packageDirectory, "dist");
    const input = await createInputModel(packageDirectory);
    const logger = silent ? SILENT_LOGGER : createConsoleLogger();
    await buildPackage({
        outputDirectory,
        input,
        clean: true,
        logger
    });
    return {};
};
