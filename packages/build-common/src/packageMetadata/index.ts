// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import type * as API from "../../types";
import { CURRENT_VERSION, parsePackageMetadata, serializePackageMetadata } from "./v1";

export const PackageMetadataV1: typeof API.PackageMetadataV1 = {
    CURRENT_VERSION,
    PACKAGE_JSON_KEY: "openPioneerFramework",
    parsePackageMetadata,
    serializePackageMetadata
};

export type PackageMetadataV1 = typeof API.PackageMetadataV1;
