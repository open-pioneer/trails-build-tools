// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import type * as API from "../../types";

const PACKAGE_NAME = "@open-pioneer/runtime";
const REACT_INTEGRATION_MODULE_ID = "@open-pioneer/runtime/react-integration";
const METADATA_MODULE_ID = "@open-pioneer/runtime/metadata";

export const RuntimeSupport: typeof API.RuntimeSupport = {
    RUNTIME_PACKAGE_NAME: PACKAGE_NAME,
    REACT_INTEGRATION_MODULE_ID,
    METADATA_MODULE_ID,
    generateReactHooks,
    parseVirtualModule
};

function parseVirtualModule(moduleId: string): "app" | "react-hooks" | undefined {
    if (!/^open-pioneer:/.test(moduleId)) {
        return undefined;
    }

    switch (moduleId) {
        case "open-pioneer:app":
            return "app";
        case "open-pioneer:react-hooks":
            return "react-hooks";
    }
    throw new Error(`Unsupported module id '${moduleId}'.`);
}

function generateReactHooks(packageName: string, runtimeModuleId = REACT_INTEGRATION_MODULE_ID) {
    return `
import { useServiceInternal, useServicesInternal, usePropertiesInternal, useIntlInternal } from ${JSON.stringify(
        runtimeModuleId
    )};

const PACKAGE_NAME = ${JSON.stringify(packageName)};
export const useService = /*@__PURE__*/ useServiceInternal.bind(undefined, PACKAGE_NAME);
export const useServices = /*@__PURE__*/ useServicesInternal.bind(undefined, PACKAGE_NAME);
export const useProperties = /*@__PURE__*/ usePropertiesInternal.bind(undefined, PACKAGE_NAME);
export const useIntl = /*@__PURE__*/ useIntlInternal.bind(undefined, PACKAGE_NAME);
    `.trim();
}
