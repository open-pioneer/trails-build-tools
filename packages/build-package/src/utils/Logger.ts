// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import chalk from "chalk";

export interface Logger {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}

export function createConsoleLogger(): Logger {
    return {
        info(...args) {
            console.info(chalk.gray(...args));
        },
        warn(...args) {
            console.warn(chalk.yellow(...args));
        },
        error(...args) {
            console.error(chalk.red(...args));
        }
    };
}

export interface MemoryLogMessage {
    type: "info" | "warn" | "error";
    args: unknown[];
}

export function createMemoryLogger(): Logger & { messages: MemoryLogMessage[] } {
    const messages: MemoryLogMessage[] = [];
    const logWithType = (type: "info" | "warn" | "error", ...args: unknown[]) => {
        messages.push({ type, args });
    };
    return {
        messages,
        info: logWithType.bind(undefined, "info"),
        warn: logWithType.bind(undefined, "warn"),
        error: logWithType.bind(undefined, "error")
    };
}

const NO_OP = () => undefined;

export const SILENT_LOGGER: Logger = {
    info: NO_OP,
    warn: NO_OP,
    error: NO_OP
};
