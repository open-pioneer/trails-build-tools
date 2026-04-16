// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
export function expectError(fn: () => Promise<void>): Promise<Error> {
    return fn().then(
        () => {
            throw new Error("Expected an error but none was thrown.");
        },
        (err) => {
            if (!(err instanceof Error)) {
                throw new Error(`Expected an error but got: ${err}`);
            }
            return err;
        }
    );
}
