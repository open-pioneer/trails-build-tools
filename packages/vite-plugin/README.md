# @open-pioneer/vite-plugin-pioneer

Implements certain build-time features required by pioneer apps.

Usage:

```js
// In your vite configuration file
import { pioneer } from "@open-pioneer/vite-plugin-pioneer";

export default defineConfig({
    // ...
    plugins: [
        pioneer({
            // See configuration reference below
            rootSite: true
        })
        // ...
    ]
});
```

## Configuration reference

All configuration properties are optional.
At least one of `rootSite`, `sites` or `apps` should be non-empty for a successful build.

````ts
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
````

## Features

### Multi page support

Vite is by default configured to create a single page application (i.e. a single html file with assets).
The pioneer repository supports multiple deployment modes that can each be achieved by configuring this plugin:

1. Building a single page application.
   Configure `rootSite: true` and leave `sites` and `apps` empty.

2. Building one or more web components.
   Configure the `apps` parameter:

    ```js
    pioneer({
        // Creates a my-app.js file in dist/ that can be imported from the browser.
        apps: ["my-app"]
    });
    ```

3. Building a multi page application.
   This is convenient for testing and also sometimes for production, since it allows for demonstrating apps in multiple configuration.

    For example, a project might have a set of sample sites for local development and testing:

    ```js
    pioneer({
        // Only enable sites during testing.
        // `testing` can be, for example, initialized from the environment or from a local configuration file.
        //
        // See https://vitejs.dev/config/#configuring-vite for more details
        sites: testing && ["sites/sample-1", "sites/sample-2"],

        // Always deploy my-app.js as a web component.
        apps: ["my-app"]
    });
    ```

This plugin internally configures the rollup options inside vite's config to achieve above goals.
`build.rollupOptions.input` and `.output` should not be altered manually when using this plugin.

## Development

To manually build the plugin, run `pnpm run build`.
This build does _not_ include tests.

`pnpm run test` will execute all tests using vitest.

### Debugging the vite plugin

Run vite dev with the `DEBUG` environment variable set.
This will enable debug logging:

```bash
$ DEBUG="open-pioneer:*" pnpm exec vite dev --clearScreen=false
```

will print something like

```plain
open-pioneer:metadata Request for app metadata of /home/michael/projects/starter/src/apps/date-app +0ms
open-pioneer:metadata Request for package metadata of /home/michael/projects/starter/src/apps/date-app +1ms
open-pioneer:metadata Analyzing package at /home/michael/projects/starter/src/apps/date-app +14ms
open-pioneer:metadata Visiting package directory /home/michael/projects/starter/src/apps/date-app. +0ms
open-pioneer:codegen Adding manual watch for /home/michael/projects/starter/src/apps/date-app/package.json +0ms
open-pioneer:codegen Adding manual watch for /home/michael/projects/starter/src/apps/date-app/build.config.mjs +70ms
...
```

You can also add a `--debug` flag to `vite` to show vite's internal log messages.

## License

```
Copyright 2023 con terra GmbH and contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
