// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import Handlebars from "handlebars";

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

/** Handlebars templates. See https://handlebarsjs.com/ */
const partials = {
    "index": Handlebars.compile(`
        <html>
        <head>
            <title>License report for {{projectName}}</title>
            <style>
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
            </style>
        </head>
        <body>
            <h1>License report for {{projectName}}</h1>

            <div>
                <a id="show-all" class="toggle" href="#">
                    Show all
                </a>
                | 
                <a id="hide-all" class="toggle" href="#">
                    Hide all
                </a>
            </div>

            <ul class="dependencies">
            {{#each licenseItems}}
                {{> license-item }}
            {{/each}}
            </ul>
            <script>
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
            </script>
        </body>
        </html>
    `),
    "license-item": Handlebars.compile(`
        <li class="dependency">
            <div class="header">
                <a class="toggle title" href="#" data-target="{{id}}-content">
                    <h2>{{ name }} {{ version }} (License: {{license}})</h2>
                </a>
            </div>
            <div id="{{id}}-content" class="content">
                <h3>License</h3>
                <pre>{{licenseText}}</pre>
                {{#if noticeText}}
                    <h3>Notice</h3>
                    <pre>{{noticeText}}</pre>
                {{/if}}
            </div>
        </li>
    `)
};

/**
 * Generates a html report from the given inputs.
 */
export function generateReportHtml(projectName: string, licenseItems: LicenseItem[]): string {
    return partials.index(
        {
            projectName,
            licenseItems
        },
        {
            partials
        }
    );
}

