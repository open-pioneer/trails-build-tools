// SPDX-FileCopyrightText: con terra GmbH and contributors
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
