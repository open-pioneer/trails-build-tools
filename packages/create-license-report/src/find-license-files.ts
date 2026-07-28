// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { globSync } from "tinyglobby";
import { basename } from "path";
import { FileSpec } from "./license-config";

const LICENSE_FILES = "LICENSE LICENCE COPYING".split(" ");
const NOTICE_FILES = "NOTICE".split(" ");

/**
 * Attempts to find license files in the given directory.
 * Returns the first file matching one of the file patterns above,
 * without checking the content.
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
    const allFiles = globSync("*", {
        followSymbolicLinks: false,
        cwd: directory
    });

    for (const candidateName of candidates) {
        const match = allFiles.find((matchPath) =>
            basename(matchPath).toLowerCase().includes(candidateName.toLowerCase())
        );
        if (match) return [match];
    }
    return [];
}
