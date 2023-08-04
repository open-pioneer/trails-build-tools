# Changelog @open-pioneer/vite-plugin-pioneer

## 1.1.0

### Minor Changes

-   e05d707: Include devDependencies in dependency analysis. Dev dependencies will now have their services, properties, etc. automatically linked into the application.

### Patch Changes

-   99354bf: Improve error message when two versions of the same pioneer package are encountered.
    Only a single version per pioneer package per app is supported: all packages must share the same version and location on disk.

    The vite overlay in the browser now shows a comprehensible error message such as this:

    ```text
    [plugin:pioneer:codegen] Encountered the package '@open-pioneer/runtime' at two different locations.
    Pioneer packages cannot be used more than once in the same application.
    All packages must use a common version of '@open-pioneer/runtime'.

    1. @open-pioneer/runtime@1.0.0 at $HOME/projects/pioneer/starter/node_modules/.pnpm/@open-pioneer+runtime@1.0.0_@formatjs+intl@2.9.0_@open-pioneer+chakra-integration@1.0.0_@open_4cza3noe47gq2v2rsqn2cypo4q/node_modules/@open-pioneer/runtime

    2. @open-pioneer/runtime@0.1.5 at $HOME/projects/pioneer/starter/node_modules/.pnpm/@open-pioneer+runtime@0.1.5_@formatjs+intl@2.9.0_@open-pioneer+chakra-integration@0.1.4_@open_m544g2vyxvedm3ipuqpqhltgfy/node_modules/@open-pioneer/runtime
    ```

-   146743d: Bump dependencies
-   Updated dependencies [3a0fb62]
-   Updated dependencies [146743d]
    -   @open-pioneer/build-common@1.0.2

## 1.0.2

### Patch Changes

-   Updated dependencies [1a8c745]
    -   @open-pioneer/build-common@1.0.1

## 1.0.1

### Patch Changes

-   8985433: Redo release (1.0.0 was published by mistake very early)

## 1.0.0

### Major Changes

-   991be0f: Initial release

### Patch Changes

-   Updated dependencies [991be0f]
    -   @open-pioneer/build-common@1.0.0

## 0.8.7

### Patch Changes

-   f0cd283: Add package.json metadata
-   Updated dependencies [f0cd283]
    -   @open-pioneer/build-common@0.6.1

## 0.8.6

### Patch Changes

-   cf32df5: Add another workaround that unfortunately currently requires pnpm's `shamefully-hoist` option.

    [`shamefully-hoist`](https://pnpm.io/npmrc#shamefully-hoist) allows the application to 'see' all other installed node packages.
    This is usually a bad practice but we currently require it for the virtual module that imports all open pioneer services.
    For more details see the linked commit.

## 0.8.5

### Patch Changes

-   ab271dc: Don't consider virtual app-css modules if they end in '.map'. This is a workaround for vite currently requesting source maps for inline css with the 'wrong' importer.
-   38d3c6b: Work around problems with vite's depOptimizer

## 0.8.4

### Patch Changes

-   57a81cd: Improve error logging in dev mode.

## 0.8.3

### Patch Changes

-   e6bbbfb: Simplify license comment in README
-   Updated dependencies [b6f55fe]
-   Updated dependencies [e6bbbfb]
    -   @open-pioneer/build-common@0.6.0

## 0.8.2

### Patch Changes

-   fdb5347: Use unresolved module ids for generated code.
-   Updated dependencies [fdb5347]
    -   @open-pioneer/build-common@0.5.1

## 0.8.1

### Patch Changes

-   9f82090: Use react hooks code generation from @open-pioneer/build-common
-   Updated dependencies [9f82090]
    -   @open-pioneer/build-common@0.5.0

## 0.8.0

### Minor Changes

-   23a6f4c: Report an error if a package uses the 'overrides' property in an i18n file (even if there are no actual overrides)
-   348afd8: An error is now thrown if a package uses the 'overrides' key, even if the object is empty.

### Patch Changes

-   aeb702c: Add supported node versions (>= 16) to package.json
-   38c8ee0: Don't re-emit warnings when a cached metadata entry is returned.
-   Updated dependencies [348afd8]
-   Updated dependencies [aeb702c]
    -   @open-pioneer/build-common@0.4.0

## 0.7.0

### Minor Changes

-   900057b: Allow framework metadata from package.json for local packages. It is still an error to use both in a package at the same time.

## 0.6.1

### Patch Changes

-   0692aa2: Revert back to commonjs
-   Updated dependencies [0692aa2]
    -   @open-pioneer/build-common@0.3.1

## 0.6.0

### Minor Changes

-   393b294: Distribute package as ESM.
-   39ee4c0: Use stable metadata facilities from @open-pioneer/build-common

### Patch Changes

-   Updated dependencies [393b294]
-   Updated dependencies [454ea2b]
-   Updated dependencies [39855ce]
    -   @open-pioneer/build-common@0.3.0

## 0.5.3

### Patch Changes

-   ef54f35: Move loading of build config file into common package.
-   Updated dependencies [ef54f35]
-   Updated dependencies [125fd57]
-   Updated dependencies [37413f4]
    -   @open-pioneer/build-common@0.2.0

## 0.5.2

### Patch Changes

-   434cc23: Migrate all tests to vitest.
-   41399fa: Use new shared package to validate build.config.mjs
-   Updated dependencies [41399fa]
    -   @open-pioneer/build-common@0.1.0

## 0.5.1

### Patch Changes

-   4f271c8: Build using new build script.

## v0.5.0

-   Implement support for SCSS in package `styles`.
    `sass` must now be installed as a dependency.

## v0.4.0

-   Read services from `./services` by default

## v0.3.3

-   Improve i18n override detection

## v0.3.2

-   Initialize overrides to an empty map when a package name is mentioned.

## v0.3.1

-   Relax i18n schema validation: More nulls are allowed in yaml to allow for empty object syntax

## v0.3.0

-   Add support for advanced app configuration (with custom paths)
-   Change configuration of sites to allow for more flexible locations

## v0.2.4

-   Add support for the `useIntl` hook

## v0.2.3

-   Add caching for i18n files

## v0.2.2

-   Make type of app metadata required

## v0.2.1

-   Do not skip package metadata during codegen anymore.
    All packages (with pioneer extensions) have an entry in the app's metadata.

## v0.2.0

-   Initial support for i18n files

## v0.1.0

-   Initial release
