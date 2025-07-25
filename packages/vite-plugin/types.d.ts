// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { type Plugin } from "vite";

export interface PioneerPluginOptions {
    /**
     * Whether to include the root `index.html` site (by default at `src/index.html`) in the build.
     *
     * The file is always available when using the development server, but may be excluded when
     * when deploying the project as it often contains content for testing.
     *
     * @default false
     */
    rootSite?: boolean;

    /**
     * List of sites to include in the build.
     *
     * Sites are located at `src/<SITE>/index.html` by default.
     * Note that `<SITE>` may contain nested directory paths.
     *
     * @default []
     */
    sites?: string[] | undefined | false;

    /**
     * List of apps to include in the build.
     * Apps typically register a custom web component.
     *
     * Apps are located at `src/apps/<APP_NAME>/app.<EXT>` by default.
     * When an app is included in the build, the `dist` directory will
     * contain an `<APP_NAME>.js` that can be directly imported from the browser.
     *
     * You can also use custom app locations instead of placing your apps in the `apps` directory,
     * see examples below.
     *
     * Multiple extensions are supported for the app's main entry point: .ts, .tsx, .js and .jsx.
     *
     * @example
     * Distribute the app at `src/apps/my-app/app.ts` as `my-app.js`:
     *
     * ```js
     * {
     *      apps: ["my-app"]
     * }
     * ```
     *
     * Distribute the app at `src/custom/location/app.js` as `output-app.js`:
     *
     * ```js
     * {
     *      apps: {
     *          "output-app": "custom/location/app.js"
     *      }
     * }
     * ```
     *
     * @default []
     */
    apps?: string[] | AdvancedAppOptions | undefined | false;
}

export interface AdvancedAppOptions {
    /**
     * Associates an app name (the name of the .js file in the output directory)
     * with the location of the app source code (a file name relative to the source directory).
     */
    [appName: string]: string;
}

declare function pioneer(options?: PioneerPluginOptions): Plugin[];
