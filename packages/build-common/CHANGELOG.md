# Changelog @open-pioneer/build-common

## 0.4.0

### Minor Changes

-   348afd8: 'overrides' are now undefined in PackageConfig if the package does not user overrides at all (instead of an empty map).

### Patch Changes

-   aeb702c: Add supported node versions (>= 16) to package.json

## 0.3.1

### Patch Changes

-   0692aa2: Revert back to commonjs

## 0.3.0

### Minor Changes

-   393b294: Distribute package as ESM.
-   454ea2b: Introduce new stable metadata format and move internal package representation into this package
-   39855ce: Introduce publishConfig in build.config.mjs

## 0.2.0

### Minor Changes

-   ef54f35: Move loading of build config file into common package.
-   125fd57: Introduce support for entryPoints in build.config.mjs
-   37413f4: Add support for copying assets.

## 0.1.0

### Minor Changes

-   41399fa: Move validation of build.config.mjs into a shared package
