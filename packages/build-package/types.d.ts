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
     * Enables or disables generation of TypeScript declaration files (`.d.ts`).
     *
     * Generation of declaration files requires a (minimal) `tsconfig.json` in the package's directory.
     *
     * Defaults to `true` if a `tsconfig.json` is present, `false` otherwise.
     */
    types?: boolean;

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
     * Optional validation options.
     *
     * Validation problems result in warnings (or errors, if {@link strict}) during the build.
     */
    validation?: ValidationOptions;
}

export interface ValidationOptions {
    /**
     * Whether a LICENSE file is required.
     *
     * Defaults to `true`.
     */
    requireLicense?: boolean;

    /**
     * Whether a README file is required.
     *
     * Defaults to `true`.
     */
    requireReadme?: boolean;

    /**
     * Whether a CHANGELOG file is required.
     *
     * Defaults to `true`.
     */
    requireChangelog?: boolean;
}

/**
 * Builds a package to be published.
 *
 * Compiled output is written to the package's `dist` directory.
 *
 * Returns a promise that rejects when there was a fatal build error.
 */
export function build(options: BuildOptions): Promise<void>;
