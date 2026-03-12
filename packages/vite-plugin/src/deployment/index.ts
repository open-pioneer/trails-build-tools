// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { OutputBundle, PluginContext } from "rollup";

const SENTINEL_FILENAME = "__base_url_sentinel__";

/**
 * Provides a virtual module that returns metadata about the current deployment.
 * This is the implementation of `open-pioneer:deployment`.
 *
 * NOTE: This works by creating a (dummy) asset file and computing the URL to it.
 * There does not seem to be a more elegant way.
 * See also https://github.com/vitejs/vite/discussions/21251
 */
export class DeploymentModule {
    #isDev: boolean;
    #configuredBaseUrl: string;
    #assetId: string | undefined;

    constructor(isDev: boolean, configuredBaseUrl: string) {
        this.#isDev = isDev;
        this.#configuredBaseUrl = configuredBaseUrl;
    }

    onStart(ctx: PluginContext) {
        if (this.#isDev) {
            return;
        }
        if (this.#assetId) {
            throw new Error("Illegal state: onStart() was already called");
        }

        // Create a dummy file to compute its URL, see generated source code below.
        this.#assetId = ctx.emitFile({
            type: "asset",
            fileName: SENTINEL_FILENAME,
            source: "This file should be deleted after the build."
        });
    }

    onGenerateBundle(bundle: OutputBundle) {
        if (!this.#isDev) {
            // Delete the dummy file; we only needed it to determine the URL.
            delete bundle[SENTINEL_FILENAME];
        }
    }

    onLoadModule(): string {
        if (this.#isDev) {
            let baseUrl = this.#configuredBaseUrl;
            if (!baseUrl || baseUrl === "./") {
                baseUrl = "/";
            }
            return `export const baseUrl = new URL(${JSON.stringify(baseUrl)}, window.origin).href;`;
        }
        return `
            const assetUrl = "__VITE_ASSET__${this.#assetId}__";
            export const baseUrl = new URL("./", assetUrl).href;
        `;
    }
}
