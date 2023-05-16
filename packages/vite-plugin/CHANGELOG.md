# Changelog @open-pioneer/vite-plugin-pioneer

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
