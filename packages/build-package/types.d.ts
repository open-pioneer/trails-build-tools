// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0

/** Options accepted by the {@link build} function. */
export interface BuildOptions {
    /**
     * The package to be built.
     * The output is placed into `dist` within that package.
     */
    packageDirectory: string;

    /**
     * Disable logging. Defaults to `false`.
     */
    silent?: boolean;
}

/**
 * Builds a package to be published.
 *
 * Compiled output is written to the package's `dist` directory.
 *
 * Returns a promise that rejects when there was a fatal build error.
 */
export function build(options: BuildOptions): Promise<void>;
