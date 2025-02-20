// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { Logger } from "./Logger";

/**
 * Helper class to report validation problems.
 */
export class ValidationReporter {
    readonly strict: boolean;
    private logger: Logger;
    private hasReports = false;

    constructor(logger: Logger, strict: boolean) {
        this.logger = logger;
        this.strict = strict;
    }

    /**
     * Reports a validation problem.
     *
     * Arguments are passed to the {@link Logger}'s warn (or error) method.
     */
    report(...args: unknown[]): void {
        (this.strict ? this.logger.error : this.logger.warn)(...args);
        this.hasReports = true;
    }

    /**
     * Finishes validation.
     *
     * Throws an error if there were problems and strict mode is enabled.
     */
    check() {
        if (this.strict && this.hasReports) {
            throw new Error(`Aborting due to validation errors (strict validation is enabled).`);
        }
    }
}
