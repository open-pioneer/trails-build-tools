// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
// NOTE: kept for reference, superseded by license-report-template.ts. Not imported anywhere.
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
    body {
        max-width: 960px;
        margin: auto;
    }

    .dependencies {
        list-style: none;
        margin: 0;
        margin-top: 1em;
        padding: 0;
    }

    .toggle {
        color: blue;
        text-decoration: underline;
    }

    .dependency .header h2 {
        font-size: 1.25em;
        margin-top: 0;
        margin-bottom: 0.5em;
        padding: 0;
    }

    .dependency .header .title {
        display: inline-block;
        cursor: pointer;
    }

    .dependency .content {
        display: none;

        margin-bottom: 2em;
    }

    .dependency .content h3 {
        padding: 0;
        margin: 0;
        margin-bottom: 0.5em;
    }

    .dependency .content pre {
        white-space: pre-line;
        background-color: #eeeeee;
        border-radius: 5px;
        padding: 5px;
    }

    .dependency .content-visible {
        display: block;
    }
`;

const SCRIPT = `
    const allTargets = [];

    function registerHandlers() {
        const elements = document.body.querySelectorAll(".dependency .header .title");
        for (const element of elements) {
            const target = document.getElementById(element.dataset.target);
            allTargets.push(target);

            element.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleTarget(target);
            });
        }

        document.getElementById("show-all").addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleAll(true);
        });
        document.getElementById("hide-all").addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleAll(false);
        });
    }

    function toggleTarget(target, force) {
        const className = "content-visible";
        const classList = target.classList;
        if (force != null) {
            if (force) {
                classList.add(className);
            } else {
                classList.remove(className);
            }
        } else {
            classList.toggle(className);
        }
    }

    function toggleAll(show) {
        for (const target of allTargets) {
            toggleTarget(target, show);
        }
    }

    registerHandlers();
`;

function LicenseItemView(item: LicenseItem) {
    const contentId = `${item.id}-content`;
    return h(
        "li",
        { class: "dependency", key: item.id },
        h(
            "div",
            { class: "header" },
            h(
                "a",
                { class: "toggle title", href: "#", "data-target": contentId },
                h("h2", null, `${item.name} ${item.version ?? ""} (License: ${item.license})`)
            )
        ),
        h(
            "div",
            { id: contentId, class: "content" },
            h("h3", null, "License"),
            h("pre", null, item.licenseText),
            item.noticeText
                ? [h("h3", null, "Notice"), h("pre", null, item.noticeText)]
                : null
        )
    );
}

function ReportPage(projectName: string, licenseItems: LicenseItem[]) {
    return h(
        "html",
        null,
        h(
            "head",
            null,
            h("title", null, `License report for ${projectName}`),
            h("style", { dangerouslySetInnerHTML: { __html: STYLE } })
        ),
        h(
            "body",
            null,
            h("h1", null, `License report for ${projectName}`),
            h(
                "div",
                null,
                h("a", { id: "show-all", class: "toggle", href: "#" }, "Show all"),
                " | ",
                h("a", { id: "hide-all", class: "toggle", href: "#" }, "Hide all")
            ),
            h(
                "ul",
                { class: "dependencies" },
                licenseItems.map(LicenseItemView)
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
