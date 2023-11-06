// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

/** Options accepted by the {@link build} function. */
export interface BuildOptions {
    /**
     * The package to be built.
     * The output is placed into `dist` within that package.
     */
    packageDirectory: string;

    /**
     * Custom logger for output.
     * Explicitly set this to `null` to disable output.
     *
     * Defaults to the global `console`.
     */
    logger?: Pick<Console, "error" | "warn" | "info"> | null;
}

/**
 * Builds a package to be published.
 *
 * Compiled output is written to the package's `dist` directory.
 *
 * Returns a promise that rejects when there was a fatal build error.
 */
export function build(options: BuildOptions): Promise<void>;
