// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { LicenseOptions } from "../types";
import { createLicenseFile } from "./create-license-report";

export function createLicense(options: LicenseOptions): Promise<void> {
    return createLicenseFile(options);
}
