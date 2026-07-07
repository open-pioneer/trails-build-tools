// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import glob from "fast-glob";
import { basename } from "path";
import { FileSpec } from "./license-config";

const LICENSE_FILES = "LICENSE LICENCE COPYING".split(" ");
const NOTICE_FILES = "NOTICE".split(" ");

/**
 * Attempts to find license files in the given directory.
 * Returns the first file matching one of the file patterns above,
 * without checking the content.
 *
 * For license files, this may currently fall back to the project's readme file.
 *
 * The license output must be checked manually!
 */
export function findFirstLicenseFile(directory: string): FileSpec[] {
    return toPackageFiles(findFirstMatch(directory, LICENSE_FILES));
}

/**
 * Like findLicenseFiles(), but for copyright NOTICE files.
 */
export function findFirstNoticeFile(directory: string): FileSpec[] {
    return toPackageFiles(findFirstMatch(directory, NOTICE_FILES));
}

function toPackageFiles(files: string[]): FileSpec[] {
    return files.map((file) => ({
        type: "package",
        path: file
    }));
}

function findFirstMatch(directory: string, candidates: string[]): string[] {
    // https://github.com/micromatch/micromatch#extended-globbing
    const pattern = "(" + candidates.join("|") + ")";
    const matches = glob.sync(`?(*)${pattern}*`, {
        followSymbolicLinks: false,
        cwd: directory,
        caseSensitiveMatch: false
    });

    for (const candidateName of candidates) {
        const match = matches.find((matchPath) =>
            basename(matchPath).toLowerCase().includes(candidateName.toLowerCase())
        );
        if (match) return [match];
    }
    return [];
}
