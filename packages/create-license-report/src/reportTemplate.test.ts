// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";
import { generateReportHtml, LicenseItem } from "./reportTemplate";

const HOSTILE_ITEM: LicenseItem = {
    name: "<b>pkg</b> & co",
    version: "1.0.0",
    license: "MIT",
    licenseText: "Line 1\u2028</script><!-- <script>alert(1)</script>",
    noticeText: ""
};

it("embeds the payload without ending the script element early", () => {
    const html = generateReportHtml("<project>", [HOSTILE_ITEM]);

    // The payload script and the page script are the only script elements.
    expect(html.match(/<\/script>/g)).toHaveLength(2);

    const payload = JSON.parse(extractPayload(html));
    expect(payload).toEqual({ projectName: "<project>", items: [HOSTILE_ITEM] });
});

it("escapes the project name in the markup", () => {
    const html = generateReportHtml("<project> & co", []);
    expect(html).toContain("<title>License Report – &lt;project&gt; &amp; co</title>");
    expect(html).not.toContain("<project>");
});

function extractPayload(html: string): string {
    const match = html.match(/<script id="license-data" type="application\/json">(.*?)<\/script>/s);
    if (!match?.[1]) {
        throw new Error("payload not found");
    }
    return match[1];
}
