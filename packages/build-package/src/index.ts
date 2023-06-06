// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import type * as API from "..";
import { createInputModel } from "./model/InputModel";
import { buildPackage } from "./buildPackage";
import { SILENT_LOGGER, createConsoleLogger } from "./utils/Logger";
import { resolveOptions } from "./model/Options";

type Build = typeof API.build;

export const build: Build = async ({ packageDirectory, silent }) => {
    const input = await createInputModel(packageDirectory);
    const options = await resolveOptions(packageDirectory, input.buildConfig.publishConfig);
    const logger = silent ? SILENT_LOGGER : await createConsoleLogger();
    await buildPackage({
        input,
        options,
        logger
    });
};
