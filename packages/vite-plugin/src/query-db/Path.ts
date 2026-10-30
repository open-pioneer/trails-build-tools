// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { resolve } from "node:path";
import { normalizePath } from "vite";

declare const pathBrand: unique symbol;

/**
 * An absolute file path with forward slashes.
 * Only {@link toPath} creates values of this type, so a `Path` is normalized by construction.
 */
export type Path = string & { readonly [pathBrand]: true };

export function toPath(input: string): Path {
    return normalizePath(resolve(input)) as Path;
}
