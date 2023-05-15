// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
export interface BuildOptions {
    todo?: void;
}

export interface BuildResult {
    todo?: void;
}

export function build(options: BuildOptions): Promise<BuildResult>;
