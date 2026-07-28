// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

export interface Logger {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}

const NO_OP = () => undefined;

export const SILENT_LOGGER: Logger = {
    info: NO_OP,
    warn: NO_OP,
    error: NO_OP
};

export async function getChalk() {
    const { default: chalk } = await import("chalk");
    return chalk;
}

export async function createConsoleLogger(
    console: Pick<Console, "info" | "warn" | "error">
): Promise<Logger> {
    const chalk = await getChalk();
    return {
        info(...args) {
            console.info(...args);
        },
        warn(...args) {
            console.warn(chalk.yellow(...args));
        },
        error(...args) {
            console.error(chalk.red(...args));
        }
    };
}
