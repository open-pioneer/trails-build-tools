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
     * Enables or disables strict checks.
     *
     * When strict checks are enabled, certain errors (such as a missing license file)
     * become fatal and abort the build.
     *
     * This can be set to `false` during development to update a package bit by bit,
     * but it should otherwise be `true` to detect common errors.
     *
     * Defaults to `true`.
     */
    strict?: boolean;

    /**
     * Enables or disables generation of [source maps](https://web.dev/source-maps/).
     *
     * Note that generated source maps will contain the entire, unprocessed source code
     * if the source files.
     *
     * Defaults to `true`.
     */
    sourceMaps?: boolean;

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
