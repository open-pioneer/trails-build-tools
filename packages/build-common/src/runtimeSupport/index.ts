// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { posix } from "node:path";
import { dataToEsm, normalizePath } from "@rollup/pluginutils";
import { gte } from "semver";
import { canParse } from "../versionUtils";

declare const VALIDATED_RUNTIME_VERSION: unique symbol;

export type VirtualModuleType = VirtualModule["type"];

export type VirtualModule = PlainVirtualModule | TestSupportVirtualModule;

/** A virtual module whose id carries no data of its own. */
export interface PlainVirtualModule {
    type: "app" | "react-hooks" | "source-info" | "deployment";
}

/** The `open-pioneer:test-support` module, optionally with a `?locale=<message locale>` query. */
export interface TestSupportVirtualModule {
    type: "test-support";

    /** The requested message locale, or undefined when the package's default locale applies. */
    locale: string | undefined;
}

/**
 * A runtime version that we know we can support.
 */
export type RuntimeMetadataVersion = string & { __brand: typeof VALIDATED_RUNTIME_VERSION };

export type RuntimeValidationError = {
    code: "invalid-version" | "unsupported-version";
    error?: Error;
};

export interface RuntimePackageFeatures {
    supportsMessageBox: boolean;
}

/** Package name of the Open Pioneer Trails runtime library. */
export const RUNTIME_PACKAGE_NAME: string = "@open-pioneer/runtime";

/** The (unresolved) react-integration module id.  */
export const REACT_INTEGRATION_MODULE_ID: string = "@open-pioneer/runtime/react-integration";

/** The (unresolved) metadata module id. */
export const METADATA_MODULE_ID: string = "@open-pioneer/runtime/metadata";

/**
 * The default runtime version if none is specified.
 * For backwards compatibility.
 */
export const DEFAULT_METADATA_VERSION: RuntimeMetadataVersion = "1.0.0" as RuntimeMetadataVersion;

/**
 * Current major version supported by this tool.
 */
export const CURRENT_METADATA_MAJOR: RuntimeMetadataVersion = "1.0.0" as RuntimeMetadataVersion;

const CURRENT_RUNTIME_METADATA_VERSION = "1.1.0";

/**
 * Checks if the given module id is a virtual module.
 * Returns the parsed virtual module or undefined if the module id does not match anything.
 *
 * Only `open-pioneer:test-support` accepts a query string.
 *
 * Throws an error if the module id uses the virtual prefix without a match, as that might be a mistake by the user. */
export function parseVirtualModule(moduleId: string): VirtualModule | undefined {
    if (!/^open-pioneer:/.test(moduleId)) {
        return undefined;
    }

    const testSupportMatch = moduleId.match(/^open-pioneer:test-support(?:\?(?<query>.*))?$/);
    if (testSupportMatch) {
        return {
            type: "test-support",
            locale: parseTestSupportQuery(moduleId, testSupportMatch.groups?.["query"])
        };
    }

    switch (moduleId) {
        case "open-pioneer:app":
            return { type: "app" };
        case "open-pioneer:react-hooks":
            return { type: "react-hooks" };
        case "open-pioneer:source-info":
            return { type: "source-info" };
        case "open-pioneer:deployment":
            return { type: "deployment" };
    }
    throw new Error(`Unsupported module id '${moduleId}'.`);
}

function parseTestSupportQuery(moduleId: string, query: string | undefined): string | undefined {
    if (query === undefined) {
        return undefined;
    }

    const params = new URLSearchParams(query);
    const locale = params.get("locale");
    const keys = Array.from(params.keys());
    if (keys.length !== 1 || keys[0] !== "locale" || !locale) {
        throw new Error(
            `Invalid query in module id '${moduleId}'. Expected 'open-pioneer:test-support?locale=<locale>'.`
        );
    }
    return locale;
}

/** Returns the module content to implement the `open-pioneer:react-hooks` module. */
export function generateReactHooks(
    packageName: string,
    reactIntegrationModuleId: string = REACT_INTEGRATION_MODULE_ID
): string {
    return `
import { useServiceInternal, useServicesInternal, usePropertiesInternal, useIntlInternal } from ${JSON.stringify(
        reactIntegrationModuleId
    )};

const PACKAGE_NAME = ${JSON.stringify(packageName)};
export const useService = /*@__PURE__*/ useServiceInternal.bind(undefined, PACKAGE_NAME);
export const useServices = /*@__PURE__*/ useServicesInternal.bind(undefined, PACKAGE_NAME);
export const useProperties = /*@__PURE__*/ usePropertiesInternal.bind(undefined, PACKAGE_NAME);
export const useIntl = /*@__PURE__*/ useIntlInternal.bind(undefined, PACKAGE_NAME);
    `.trim();
}

/**
 * Generates the module containing the sourceId of the importing file.
 *
 * `packageName` is the name of the package.
 * `relativeModulePath` is the path of the module relative to the package root.
 */
export function generateSourceInfo(packageName: string, relativeModulePath: string): string {
    const sourceId = getSourceId(packageName, relativeModulePath);
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

/**
 * Returns the parsed runtime version if the code generation can support it, otherwise `undefined`.
 */
export function getSupportedRuntimeMetadataVersion(
    runtimeMetadataVersion: string
): RuntimeMetadataVersion | RuntimeValidationError {
    let supports;
    try {
        supports = canParse(CURRENT_RUNTIME_METADATA_VERSION, runtimeMetadataVersion);
    } catch (e) {
        return {
            code: "invalid-version",
            error: e as Error
        };
    }

    if (!supports) {
        return { code: "unsupported-version" };
    }
    return runtimeMetadataVersion as RuntimeMetadataVersion;
}

/**
 * Returns features of the given runtime version that can be used by the code generator.
 */
export function getRuntimeFeatures(runtimeVersion: RuntimeMetadataVersion): RuntimePackageFeatures {
    const supportsMessageBox = gte(runtimeVersion, "1.1.0");
    return {
        supportsMessageBox
    };
}

function getSourceId(packageName: string, relativeModulePath: string) {
    const normalizedModulePath = normalizePath(relativeModulePath);
    const parsedResult = posix.parse(normalizedModulePath);
    const nameWithoutExt = parsedResult.name.replace(/\..*$/, "");
    const relativeSourceId = posix.join(parsedResult.dir, nameWithoutExt);
    return `${packageName}/${relativeSourceId}`;
}
