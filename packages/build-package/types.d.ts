// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0

/** Options accepted by the {@link build} function. */
export interface BuildOptions {
    /**
     * The package to be built.
     * The output is placed into `dist` within that package.
     */
    packageDirectory: string;
}

export interface BuildResult {
    todo?: void;
}

export function build(options: BuildOptions): Promise<BuildResult>;
