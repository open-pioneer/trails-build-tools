// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { readFile } from "fs/promises";
import { ReportableError } from "../ReportableError";
import {
    canParse,
    CURRENT_RUNTIME_VERSION,
    isRuntimeVersion,
    MIN_SUPPORTED_RUNTIME_VERSION,
    PackageMetadataV1,
    RUNTIME_VERSIONS,
    RuntimeVersion
} from "@open-pioneer/build-common";
import { join } from "node:path";
import { fileExists } from "../utils/fileUtils";
import { createDebugger } from "../utils/debug";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:parseIGlobalPackageJson");

export async function readRootPackageForRuntimeVersion(
    sourceRoot: string
): Promise<RuntimeVersion> {
    isDebug && debug(`Read root package for runtime version ${sourceRoot}`);
    const sourcePackageJSON = join(sourceRoot, "..", "package.json");
    if (!(await fileExists(sourcePackageJSON))) {
        isDebug &&
            debug(
                `No root package for runtime version ${sourceRoot} found. Assume minimum supported Version.`
            );
        return MIN_SUPPORTED_RUNTIME_VERSION;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let packageJsonContent: any;
    try {
        packageJsonContent = JSON.parse(await readFile(sourcePackageJSON, "utf-8"));
    } catch (e) {
        throw new ReportableError(`Failed to read ${sourcePackageJSON}`, { cause: e });
    }
    const frameworkMetadata = packageJsonContent[PackageMetadataV1.PACKAGE_JSON_KEY] ?? undefined;
    if (
        frameworkMetadata &&
        isRuntimeVersion(frameworkMetadata.runtimeVersion) &&
        canParse(CURRENT_RUNTIME_VERSION, frameworkMetadata.runtimeVersion)
    ) {
        isDebug && debug(`Set runtime version to  ${frameworkMetadata.runtimeVersion}`);
        return frameworkMetadata.runtimeVersion;
    } else {
        throw new ReportableError(
            `Unsupported runtime version ${frameworkMetadata.runtimeVersion}! Supported versions are: ${RUNTIME_VERSIONS.join(", ")}`
        );
    }
}
