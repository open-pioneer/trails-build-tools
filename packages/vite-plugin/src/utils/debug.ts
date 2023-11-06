// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { debug } from "debug";

export interface Debugger {
    (msg: string, ...args: unknown[]): void;
}

export function createDebugger(namespace: string): Debugger {
    const logger = debug(namespace);
    return function debugFunction(...args) {
        logger(...args);
    };
}
