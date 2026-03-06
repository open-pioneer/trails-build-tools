// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { posix } from "node:path";
import { dataToEsm, normalizePath } from "@rollup/pluginutils";
import type * as API from "../../types";

const PACKAGE_NAME = "@open-pioneer/runtime";
const REACT_INTEGRATION_MODULE_ID = "@open-pioneer/runtime/react-integration";
const METADATA_MODULE_ID = "@open-pioneer/runtime/metadata";

export const RuntimeSupport: typeof API.RuntimeSupport = {
    RUNTIME_PACKAGE_NAME: PACKAGE_NAME,
    REACT_INTEGRATION_MODULE_ID,
    METADATA_MODULE_ID,
    generateReactHooks,
    parseVirtualModule,
    generateSourceInfo
};

function parseVirtualModule(moduleId: string): API.RuntimeSupport.VirtualModuleType | undefined {
    if (!/^open-pioneer:/.test(moduleId)) {
        return undefined;
    }

    switch (moduleId) {
        case "open-pioneer:app":
            return "app";
        case "open-pioneer:react-hooks":
            return "react-hooks";
        case "open-pioneer:source-info":
            return "source-info";
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

function generateSourceInfo(packageName: string, modulePath: string) {
    const sourceId = getSourceId(packageName, modulePath);
    const sourceInfo = {
        sourceId
    };
    return dataToEsm(sourceInfo, {
        compact: false,
        namedExports: true,
        preferConst: true,
        objectShorthand: true
    });
}

function getSourceId(packageName: string, relativeModulePath: string) {
    const normalizedModulePath = normalizePath(relativeModulePath);
    const parsedResult = posix.parse(normalizedModulePath);
    const nameWithoutExt = parsedResult.name.replace(/\..*$/, "");
    const relativeSourceId = posix.join(parsedResult.dir, nameWithoutExt);
    return `${packageName}/${relativeSourceId}`;
}
