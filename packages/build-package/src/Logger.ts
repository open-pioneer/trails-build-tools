// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0

export interface Logger {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}

export function createConsoleLogger(): Logger {
    return {
        info(...args) {
            console.info(...args);
        },
        warn(...args) {
            console.warn(...args);
        },
        error(...args) {
            console.error(...args);
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
