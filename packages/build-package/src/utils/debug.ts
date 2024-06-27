// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import debugPkg from "debug";
const { debug } = debugPkg;

export interface Debugger {
    (msg: string, ...args: unknown[]): void;
}

/**
 * Uses the 'debug' package (see https://www.npmjs.com/package/debug).
 *
 * Run the process with the `DEBUG` environment variable set to `open-pioneer:*` (or other patterns) to show output:
 *
 * ```bash
 * $ DEBUG=open-pioneer:* build-package ...
 * ```
 */
export function createDebugger(namespace: string): Debugger {
    const logger = debug(namespace);
    return function debugFunction(...args) {
        logger(...args);
    };
}
