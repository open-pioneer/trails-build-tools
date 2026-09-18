// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { readdirSync } from "node:fs";
import { parse } from "node:path";
import { FileSpec } from "./readLicenseConfig";

const LICENSE_FILES = ["license", "licence", "copying"];
const NOTICE_FILES = ["notice"];

// Extensions a license text may have when its file name is not just "LICENSE" (e.g. "LICENSE-MIT.txt").
const TEXT_EXTENSIONS = new Set(["", ".md", ".txt", ".markdown"]);

/**
 * Attempts to find the license file in the given directory.
 * Returns the first file whose name matches one of the well known license file names,
 * without checking its content.
 *
 * The license output must be checked manually!
 */
export function findFirstLicenseFile(directory: string): FileSpec[] {
    return toPackageFiles(findFirstMatch(directory, LICENSE_FILES));
}

/**
 * Like {@link findFirstLicenseFile}, but for copyright NOTICE files.
 */
export function findFirstNoticeFile(directory: string): FileSpec[] {
    return toPackageFiles(findFirstMatch(directory, NOTICE_FILES));
}

function toPackageFiles(file: string | undefined): FileSpec[] {
    return file ? [{ type: "package", path: file }] : [];
}

/**
 * A file named exactly like a candidate (ignoring case and extension, e.g. `LICENSE.md` or `LICENSE.BSD`) wins.
 * Otherwise a text file that carries the candidate as a word, such as `LICENSE-MIT.txt`, is accepted.
 * Files like `license-config.yaml` or `licenses.json` match neither rule.
 */
function findFirstMatch(directory: string, candidates: string[]): string | undefined {
    const files = readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .sort();

    for (const candidate of candidates) {
        const exact = files.find((file) => stem(file) === candidate);
        if (exact) {
            return exact;
        }
    }
    for (const candidate of candidates) {
        const partial = files.find((file) => {
            const path = parse(file);
            const extension = path.ext.toLowerCase();
            return (
                TEXT_EXTENSIONS.has(extension) &&
                path.name.toLowerCase().split(/[-_]/).includes(candidate)
            );
        });
        if (partial) {
            return partial;
        }
    }
    return undefined;
}

function stem(file: string): string {
    return parse(file).name.toLowerCase();
}
