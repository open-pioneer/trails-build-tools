// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { h } from "preact";
import { render } from "preact-render-to-string";

export interface LicenseItem {
    /** Unique id */
    id: string;

    /** Project name */
    name: string;

    /** Project version */
    version?: string;

    /** License name(s) */
    license: string;

    /** License text(s) */
    licenseText: string;

    /** Notice text(s) */
    noticeText: string;
}

const STYLE = `
    :root {
        color-scheme: light;
        --bg: #f4f5f7;
        --surface: #ffffff;
        --border: #e2e4e9;
        --text: #1c1f26;
        --text-muted: #5b6270;
        --accent: #3654d1;
        --accent-contrast: #ffffff;
        --radius: 10px;
        font-synthesis: none;
    }

    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family:
            "Segoe UI",
            system-ui,
            -apple-system,
            Roboto,
            Helvetica,
            Arial,
            sans-serif;
        line-height: 1.5;
    }

    a {
        color: var(--accent);
    }

    .page-header {
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        padding: 2rem 1.5rem;
    }

    .page-header-inner {
        max-width: 880px;
        margin: 0 auto;
    }

    .page-header h1 {
        margin: 0;
        font-size: 1.5rem;
        letter-spacing: -0.01em;
    }

    .page-header .project-name {
        margin: 0.25rem 0 0;
        color: var(--text-muted);
        font-size: 1rem;
    }

    .stats {
        display: flex;
        gap: 1.5rem;
        margin-top: 1rem;
        flex-wrap: wrap;
    }

    .stat {
        font-size: 0.875rem;
        color: var(--text-muted);
    }

    .stat strong {
        color: var(--text);
        font-size: 1rem;
    }

    main {
        max-width: 880px;
        margin: 0 auto;
        padding: 1.5rem;
    }

    .toolbar {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        margin-bottom: 1.25rem;
        flex-wrap: wrap;
    }

    #search {
        flex: 1 1 240px;
        padding: 0.55rem 0.8rem;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        font-size: 0.9rem;
        background: var(--surface);
        color: var(--text);
    }

    #search:focus {
        outline: 2px solid var(--accent);
        outline-offset: 1px;
    }

    .toolbar-actions {
        display: flex;
        gap: 0.5rem;
    }

    .toolbar-actions button {
        padding: 0.5rem 0.9rem;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
        color: var(--text);
        font-size: 0.85rem;
        cursor: pointer;
    }

    .toolbar-actions button:hover {
        border-color: var(--accent);
        color: var(--accent);
    }

    .dependencies {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .dependency {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
    }

    .dependency[hidden] {
        display: none;
    }

    .dependency summary {
        display: flex;
        align-items: baseline;
        gap: 0.6rem;
        padding: 0.85rem 1rem;
        cursor: pointer;
        list-style: none;
    }

    .dependency summary::-webkit-details-marker {
        display: none;
    }

    .dependency summary::before {
        content: "\\25B8";
        display: inline-block;
        color: var(--text-muted);
        transition: transform 0.15s ease;
        flex: 0 0 auto;
    }

    .dependency[open] summary::before {
        transform: rotate(90deg);
    }

    .dep-name {
        font-weight: 600;
    }

    .dep-version {
        color: var(--text-muted);
        font-size: 0.85rem;
    }

    .license-badge {
        margin-left: auto;
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
    }

    .dependency-content {
        padding: 0 1rem 1.1rem;
        border-top: 1px solid var(--border);
    }

    .dependency-content h3 {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
        margin: 1rem 0 0.4rem;
    }

    .dependency-content pre {
        white-space: pre-wrap;
        word-break: break-word;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.75rem;
        margin: 0;
        font-size: 0.8rem;
        font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
        max-height: 20rem;
        overflow: auto;
    }

    .empty-state {
        text-align: center;
        color: var(--text-muted);
        padding: 2rem 0;
    }
`;

const SCRIPT = `
    const list = document.getElementById("dependency-list");
    const items = Array.from(list.querySelectorAll(".dependency"));
    const emptyState = document.getElementById("empty-state");
    const search = document.getElementById("search");

    search.addEventListener("input", () => {
        const query = search.value.trim().toLowerCase();
        let visibleCount = 0;
        for (const item of items) {
            const matches =
                !query ||
                item.dataset.name.includes(query) ||
                item.dataset.license.includes(query);
            item.hidden = !matches;
            if (matches) visibleCount++;
        }
        emptyState.hidden = visibleCount !== 0;
    });

    document.getElementById("expand-all").addEventListener("click", () => {
        for (const item of items) item.querySelector("details").open = true;
    });
    document.getElementById("collapse-all").addEventListener("click", () => {
        for (const item of items) item.querySelector("details").open = false;
    });
`;

/** Deterministically derives a muted hue for a license's badge from its name. */
function licenseHue(license: string): number {
    let hash = 0;
    for (let i = 0; i < license.length; i++) {
        hash = (hash * 31 + license.charCodeAt(i)) >>> 0;
    }
    return hash % 360;
}

function LicenseItemView(item: LicenseItem) {
    const hue = licenseHue(item.license);
    const badgeStyle = `background: hsl(${hue}, 55%, 92%); color: hsl(${hue}, 55%, 30%);`;
    return h(
        "li",
        {
            class: "dependency",
            key: item.id,
            "data-name": item.name.toLowerCase(),
            "data-license": item.license.toLowerCase()
        },
        h(
            "details",
            null,
            h(
                "summary",
                null,
                h("span", { class: "dep-name" }, item.name),
                item.version ? h("span", { class: "dep-version" }, item.version) : null,
                h("span", { class: "license-badge", style: badgeStyle }, item.license)
            ),
            h(
                "div",
                { class: "dependency-content" },
                h("h3", null, "License"),
                h("pre", null, item.licenseText),
                item.noticeText ? [h("h3", null, "Notice"), h("pre", null, item.noticeText)] : null
            )
        )
    );
}

function ReportPage(projectName: string, licenseItems: LicenseItem[]) {
    const licenseCount = new Set(licenseItems.map((item) => item.license)).size;
    return h(
        "html",
        { lang: "en" },
        h(
            "head",
            null,
            h("meta", { charset: "utf-8" }),
            h("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
            h("title", null, `License Report – ${projectName}`),
            h("style", { dangerouslySetInnerHTML: { __html: STYLE } })
        ),
        h(
            "body",
            null,
            h(
                "header",
                { class: "page-header" },
                h(
                    "div",
                    { class: "page-header-inner" },
                    h("h1", null, "License Report"),
                    h("p", { class: "project-name" }, projectName),
                    h(
                        "div",
                        { class: "stats" },
                        h(
                            "span",
                            { class: "stat" },
                            h("strong", null, String(licenseItems.length)),
                            " dependencies"
                        ),
                        h(
                            "span",
                            { class: "stat" },
                            h("strong", null, String(licenseCount)),
                            " licenses"
                        )
                    )
                )
            ),
            h(
                "main",
                null,
                h(
                    "div",
                    { class: "toolbar" },
                    h("input", {
                        id: "search",
                        type: "search",
                        placeholder: "Filter by name or license…"
                    }),
                    h(
                        "div",
                        { class: "toolbar-actions" },
                        h("button", { id: "expand-all", type: "button" }, "Expand all"),
                        h("button", { id: "collapse-all", type: "button" }, "Collapse all")
                    )
                ),
                h(
                    "ul",
                    { class: "dependencies", id: "dependency-list" },
                    licenseItems.map(LicenseItemView)
                ),
                h(
                    "p",
                    { id: "empty-state", class: "empty-state", hidden: true },
                    "No dependencies match your filter."
                )
            ),
            h("script", { dangerouslySetInnerHTML: { __html: SCRIPT } })
        )
    );
}

/**
 * Generates a html report from the given inputs.
 */
export function generateReportHtml(projectName: string, licenseItems: LicenseItem[]): string {
    return `<!DOCTYPE html>\n${render(ReportPage(projectName, licenseItems))}`;
}
