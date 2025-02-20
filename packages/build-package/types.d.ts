// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

/** Options accepted by the {@link build} function. */
export interface BuildOptions {
    /**
     * The package to be built.
     * The output is placed into `dist` within that package.
     */
    packageDirectory: string;

    /**
     * The root directory.
     *
     * When defined, this directory must be a parent of `packageDirectory`.
     * Other packages in this directory will be treated as local packages during validation steps.
     *
     * Defaults to the workspace root (npm/pnpm/yarn) or to the root of the current git repository.
     * If neither is found, an error will be thrown.
     */
    rootDirectory?: string;

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
