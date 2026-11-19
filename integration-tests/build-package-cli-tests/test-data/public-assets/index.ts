// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { getPublicAssetUrl, publicAssetsUrl } from "open-pioneer:assets";

export const assetsUrl: string = publicAssetsUrl;

export function createWorker(): Worker {
    return new Worker(getPublicAssetUrl("third-party-lib/worker.js"));
}

export async function loadData(): Promise<unknown> {
    const response = await fetch(getPublicAssetUrl("nested/data.json"));
    return await response.json();
}
