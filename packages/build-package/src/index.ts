// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import type * as API from "..";
import { createInputModel } from "./model/InputModel";
import { buildPackage } from "./buildPackage";
import { SILENT_LOGGER, createConsoleLogger } from "./utils/Logger";
import { resolveOptions } from "./model/Options";

type Build = typeof API.build;

export const build: Build = async ({ packageDirectory, rootDirectory, logger }) => {
    const input = await createInputModel(packageDirectory);
    const options = await resolveOptions(
        packageDirectory,
        rootDirectory,
        input.buildConfig.publishConfig
    );
    const internalLogger =
        logger === null ? SILENT_LOGGER : await createConsoleLogger(logger ?? console);

    await buildPackage({
        input,
        options,
        logger: internalLogger
    });
};
