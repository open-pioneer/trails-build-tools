// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

export interface LicenseOptions {
    dev: boolean;
    log: boolean;
}

export function createLicense(options: LicenseOptions): Promise<void>;
