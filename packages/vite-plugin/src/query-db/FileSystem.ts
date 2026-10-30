// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import { fileExists } from "../utils/fileUtils";
import { Path } from "./Path";

/**
 * The file operations behind the file leaves of a {@link QueryDb}.
 * The plugin uses {@link nodeFileSystem}, and tests pass an in-memory implementation.
 */
export interface FileSystem {
    /**
     * Reads a file as UTF-8 text.
     * Rejects when the file does not exist.
     */
    readFile(path: Path): Promise<string>;

    fileExists(path: Path): Promise<boolean>;
}

export const nodeFileSystem: FileSystem = {
    readFile: (path) => readFile(path, "utf8"),
    fileExists: (path) => fileExists(path)
};
