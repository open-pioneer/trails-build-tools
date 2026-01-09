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

function generateSourceInfo(packageName: string, packageDirectory: string, modulePath: string) {
    const sourceId = getSourceId(packageName, packageDirectory, modulePath);
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

export function getSourceId(packageName: string, packageDirectory: string, modulePath: string) {
    packageDirectory = normalizePath(packageDirectory);
    modulePath = normalizePath(modulePath);

    const relativePath = posix.relative(packageDirectory, modulePath);
    if (relativePath.match(/^\.\.?[\\/]/)) {
        // must not start with ./ or ../
        throw new Error("Internal error: unexpected relative path");
    }

    const parsedResult = posix.parse(relativePath);
    const nameWithoutExt = parsedResult.name.replace(/\..*$/, "");
    const relativeSourceId = posix.join(parsedResult.dir, nameWithoutExt);
    return `${packageName}/${relativeSourceId}`;
}

function isWindowsPath(path: string): boolean {
    return /\\/.test(path) || /^[a-zA-Z]:/.test(path);
}
