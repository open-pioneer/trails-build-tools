// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { RuntimeVersion } from "../../types";

export function isRuntimeVersion(value: unknown): value is RuntimeVersion {
    return value === "1.0.0" || value === "2.0.0";
}
