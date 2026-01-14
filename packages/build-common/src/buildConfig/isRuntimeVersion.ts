// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { RUNTIME_VERSIONS, RuntimeVersion } from "@open-pioneer/build-common";

export function isRuntimeVersion(value: unknown): value is RuntimeVersion {
    return RUNTIME_VERSIONS.includes(value as RuntimeVersion);
}
