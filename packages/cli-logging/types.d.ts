// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

export interface Logger {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}

export declare const SILENT_LOGGER: Logger;

export declare function getChalk(): Promise<typeof import("chalk").default>;

export declare function createConsoleLogger(
    console: Pick<Console, "info" | "warn" | "error">
): Promise<Logger>;
