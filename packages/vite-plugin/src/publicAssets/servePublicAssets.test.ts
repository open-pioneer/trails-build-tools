// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { request } from "node:http";
import { resolve } from "node:path";
import { createServer, ViteDevServer } from "vite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { pioneer } from "..";
import { TEST_DATA_DIR } from "../utils/testUtils";

const ROOT_DIR = resolve(TEST_DATA_DIR, "codegen-public-assets/src");
const PREFIX = "/@package-assets/package-with-assets";

let devServer: ViteDevServer;
let devServerUrl: string;

beforeAll(async () => {
    devServer = await createServer({
        root: ROOT_DIR,
        configFile: false,
        logLevel: "silent",
        server: { port: 0, host: "127.0.0.1", ws: false },
        optimizeDeps: { noDiscovery: true },
        plugins: [pioneer({ apps: ["test-app"] })]
    });
    await devServer.listen();
    devServerUrl = devServer.resolvedUrls?.local[0]?.replace(/\/$/, "") ?? "";
    await analyzeApp(devServer);
});

afterAll(async () => {
    await devServer?.close();
});

it("serves an existing file", async () => {
    const response = await fetch(`${devServerUrl}${PREFIX}/root.txt`);
    expect(response.status).toBe(200);

    const content = await response.text();
    expect(content).toBe("root\n");

    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(response.headers.get("etag")).toBeTruthy(); // Sirv uses file size and modified time
    expect(response.headers.get("cache-control")).toBe("no-cache");
});

it("answers a matching If-None-Match with 304", async () => {
    const first = await fetch(`${devServerUrl}${PREFIX}/root.txt`);
    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();
    await first.text();

    const second = await fetch(`${devServerUrl}${PREFIX}/root.txt`, {
        headers: { "If-None-Match": etag! }
    });
    expect(second.status).toBe(304);
});

it("serves a file from a nested directory", async () => {
    const response = await fetch(`${devServerUrl}${PREFIX}/nested/file.txt`);
    expect(response.status).toBe(200);

    const content = await response.text();
    expect(content).toBe("nested\n");
});

it("serves a file from outside the package", async () => {
    const response = await fetch(`${devServerUrl}${PREFIX}/shared/nested/shared.txt`);
    expect(response.status).toBe(200);

    const content = await response.text();
    expect(content).toBe("shared\n");
});

it("serves a file from a dependency", async () => {
    const response = await fetch(`${devServerUrl}${PREFIX}/third-party-lib/third-party.txt`);
    expect(response.status).toBe(200);

    const content = await response.text();
    expect(content).toBe("third-party\n");
});

it("allows overriding a file from an entry with higher priority", async () => {
    const response = await fetch(`${devServerUrl}${PREFIX}/third-party-lib/overwritten.txt`);
    expect(response.status).toBe(200);

    const content = await response.text();
    expect(content).toBe("overwritten\n");
});

it.each(["scope~scoped-assets", "scope%7Escoped-assets"])(
    "serves the files of a scoped package under %j",
    async (slug) => {
        const response = await fetch(`${devServerUrl}/@package-assets/${slug}/scoped.txt`);
        expect(response.status).toBe(200);

        const content = await response.text();
        expect(content).toBe("scoped\n");
    }
);

it.each(["missing.txt", "nested", "nested/", "third-party-lib/missing.js", ""])(
    "Responds with 404 for missing file %j",
    async (path) => {
        const response = await fetch(`${devServerUrl}${PREFIX}/${path}`, {
            headers: { Accept: "text/html" }
        });
        expect(response.status).toBe(404);

        const content = await response.text();
        expect(content).toBe("File not found");
    }
);

it.each([".hidden", ".dotdir/file.txt", "nested/../.hidden"])(
    "Responds with 404 for the hidden file %j",
    async (path) => {
        const response = await get(`${PREFIX}/${path}`);
        expect(response.status).toBe(404);
    }
);

it.each([
    "../package.json",
    "..%2fpackage.json",
    "..%2Fpackage.json",
    "%2e%2e/package.json",
    "%2e%2e%2fpackage.json",
    "..%5cpackage.json",
    "nested/..%2f..%2fpackage.json",
    "third-party-lib/%2e%2e/%2e%2e/package.json"
])("never serves a file outside the public asset directories for %j", async (path) => {
    const response = await get(`${PREFIX}/${path}`);
    expect([400, 404]).toContain(response.status);
    expect(response.body).not.toContain("package-with-assets");
});

it("answers a malformed URL with 400", async () => {
    const response = await get(`${PREFIX}/%E0%A4%A.txt`);
    expect(response.status).toBe(400);
});

it.each([
    "unknown/root.txt",
    "test-app/app.js",
    "scope~unknown/scoped.txt",
    "@scope/scoped-assets/scoped.txt",
    "@scope~scoped-assets/scoped.txt"
])("answers the unknown package in %j with 404", async (path) => {
    const response = await get(`/@package-assets/${path}`);
    expect(response.status).toBe(404);
});

it("leaves requests outside the prefix to vite", async () => {
    const response = await fetch(`${devServerUrl}/apps/test-app/app.js`);
    expect(response.status).toBe(200);

    const content = await response.text();
    expect(content).toContain('console.log("test-app")');
});

// Loads the open-pioneer:app module; this makes sure that package metadata is present for the file server middleware.
async function analyzeApp(server: ViteDevServer) {
    const pluginContainer = server.environments.client.pluginContainer;
    const resolved = await pluginContainer.resolveId(
        "open-pioneer:app",
        resolve(ROOT_DIR, "apps/test-app/app.js")
    );
    if (!resolved) {
        throw new Error("Failed to resolve open-pioneer:app");
    }
    await pluginContainer.load(resolved.id);
}

// Raw request to avoid fetch() doing request path normalization (e.g. dots in paths).
function get(path: string): Promise<{ status: number; body: string }> {
    return new Promise((resolvePromise, reject) => {
        const req = request(`${devServerUrl}/`, { path }, (res) => {
            let body = "";
            res.setEncoding("utf-8");
            res.on("data", (chunk: string) => (body += chunk));
            res.on("end", () => resolvePromise({ status: res.statusCode ?? 0, body }));
        });
        req.on("error", reject);
        req.end();
    });
}
