// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import type * as API from "../../types";
import {
    LATEST_VERSION,
    MINOR_VERSIONS,
    supportsFeature,
    parsePackageMetadata,
    serializePackageMetadata
} from "./v1";

export const PackageMetadataV1: typeof API.PackageMetadataV1 = {
    PACKAGE_JSON_KEY: "openPioneerFramework",
    LATEST_VERSION,
    MINOR_VERSIONS,
    supportsFeature,
    parsePackageMetadata,
    serializePackageMetadata
};

export type PackageMetadataV1 = typeof API.PackageMetadataV1;
