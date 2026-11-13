// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import type { ServerResponse } from "node:http";
import sirv from "sirv";
import type { Connect } from "vite";
import { ResolvedPublicAssetDir } from "../metadata/Metadata";
import { MetadataRepository } from "../metadata/MetadataRepository";
import { slugToPackageName } from "./packageSlug";

/** The URL segment below the base URL that holds the public assets of all packages in the dev server. */
export const PUBLIC_ASSETS_URL_SEGMENT = "@package-assets";

type RequestHandler = (req: Connect.IncomingMessage, res: ServerResponse, next: () => void) => void;

/**
 * Serves public package assets in the dev server.
 *
 * Packages are look up in the metadata repository, so they must have an entry at the time that the request is being handled.
 * This works because the code of such a package necessarily had to be loaded earlier, which triggered parsing its metadata.
 *
 * Files are read on request, so the middleware neither scans nor watches the directories.
 */
export function createPublicAssetsMiddleware(
    repository: MetadataRepository,
    base: string
): Connect.NextHandleFunction {
    const prefix = getBasePath(base) + PUBLIC_ASSETS_URL_SEGMENT + "/";
    const handlers = new Map<string, RequestHandler>();
    const getHandler = (directory: string): RequestHandler => {
        let handler = handlers.get(directory);
        if (!handler) {
            handler = sirv(directory, { dev: true, etag: true, extensions: [] });
            handlers.set(directory, handler);
        }
        return handler;
    };

    return (req, res, next) => {
        const url = req.url;
        if ((req.method !== "GET" && req.method !== "HEAD") || !url?.startsWith(prefix)) {
            return next();
        }

        let path;
        try {
            path = decodeURI(url.slice(prefix.length).replace(/[?#].*$/, ""));
        } catch {
            return replyWithStatus(res, 400, "Bad request: invalid path");
        }

        // Backslashes count as separators so that no segment can hide a dot name on Windows.
        const segments = path.split(/[/\\]/).filter((segment) => segment !== "");
        const [slug, ...assetPath] = segments;
        if (!slug || assetPath.length === 0) {
            return replyWithStatus(res, 404, "File not found");
        }

        const packageName = slugToPackageName(slug);
        const directories = repository.getLoadedPackage(packageName)?.publicAssets;
        if (!directories) {
            return replyWithStatus(res, 404, "Package assets not found");
        }

        const candidates = findCandidates(directories, assetPath);
        const serveCandidate = (index: number): void => {
            const candidate = candidates[index];
            if (!candidate) {
                return replyWithStatus(res, 404, "File not found");
            }

            // sirv decodes the URL itself, so it gets the decoded path encoded again.
            req.url = "/" + candidate.path.map(encodeURI).join("/");
            getHandler(candidate.directory)(req, res, () => serveCandidate(index + 1));
        };
        serveCandidate(0);
    };
}

interface Candidate {
    directory: string;
    path: string[];
}

/**
 * Returns the directories that may contain the file.
 */
function findCandidates(directories: ResolvedPublicAssetDir[], segments: string[]): Candidate[] {
    const candidates: Candidate[] = [];
    for (const { directory, dest } of directories) {
        const destSegments = dest === "" ? [] : dest.split("/");
        const matchesDest = destSegments.every((segment, i) => segments[i] === segment);
        if (!matchesDest) {
            continue;
        }

        const remainder = segments.slice(destSegments.length);
        if (remainder.length === 0 || remainder.some((s) => s.startsWith("."))) {
            continue;
        }

        candidates.push({ directory, path: remainder });
    }
    return candidates;
}

function getBasePath(base: string): string {
    return base === "" || base === "./" ? "/" : base;
}

function replyWithStatus(res: ServerResponse, statusCode: number, message: string): void {
    res.statusCode = statusCode;
    res.end(message);
}
