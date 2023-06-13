# Changelog @open-pioneer/build-package

## 0.7.3

### Patch Changes

-   763acf3: Disable 'declarationMap' for published packages

## 0.7.2

### Patch Changes

-   766bcb8: Make more errors non-fatal when 'strict' is disabled

## 0.7.1

### Patch Changes

-   f0cd283: Add package.json metadata
-   Updated dependencies [f0cd283]
    -   @open-pioneer/build-support@0.6.1
    -   @open-pioneer/build-common@0.6.1

## 0.7.0

### Minor Changes

-   b6f55fe: Move most package build options into the publishConfig section of build.config.mjs files.
-   e6bbbfb: Change the way output is configured in the 'build' function. A logger (e.g. console) can now be passed directly.

### Patch Changes

-   e6bbbfb: Simplify license comment in README
-   Updated dependencies [b6f55fe]
-   Updated dependencies [e6bbbfb]
    -   @open-pioneer/build-common@0.6.0
    -   @open-pioneer/build-support@0.6.0

## 0.6.2

### Patch Changes

-   Updated dependencies [fdb5347]
    -   @open-pioneer/build-common@0.5.1

## 0.6.1

### Patch Changes

-   f83172b: Fix reporting of TypeScript errors.

## 0.6.0

### Minor Changes

-   e30bf30: Implement generation of TypeScript declaration files (.d.ts).

## 0.5.2

### Patch Changes

-   4942738: Simplify source map paths. Source files appear as if they were files within the built package.

## 0.5.1

### Patch Changes

-   17b58a7: Fix usage of sass package.
-   45866f0: Improve logging

## 0.5.0

### Minor Changes

-   9f82090: Transpile open-pioneer:react-hooks at build time to avoid problems in the toolchain, e.g. when esbuild preoptimizes dependencies in vite.
-   9f82090: Ensure that a package always imports its external dependencies.

### Patch Changes

-   ac2b275: Import chalk using async import
-   Updated dependencies [9f82090]
    -   @open-pioneer/build-common@0.5.0

## 0.4.0

### Minor Changes

-   1273a16: Copy i18n files when present

### Patch Changes

-   aeb702c: Add supported node versions (>= 16) to package.json
-   Updated dependencies [348afd8]
-   Updated dependencies [aeb702c]
    -   @open-pioneer/build-common@0.4.0
    -   @open-pioneer/build-support@0.5.2

## 0.3.1

### Patch Changes

-   0a68001: Fix source map paths on windows

## 0.3.0

### Minor Changes

-   fdc4cae: Fix dependency to postcss-import

## 0.2.2

### Patch Changes

-   0692aa2: Revert back to commonjs
-   Updated dependencies [0692aa2]
    -   @open-pioneer/build-support@0.5.1
    -   @open-pioneer/build-common@0.3.1

## 0.2.1

### Patch Changes

-   003324e: Redo release

## 0.2.0

### Minor Changes

-   393b294: Distribute package as ESM.
-   5ea5830: Use stable metadata format
-   ceffb16: Add 'sourceMaps' and 'strict' parameters to `build()` API
-   a3c4609: Generate package.json and copy auxiliary files (README, LICENSE etc.) from source package.
-   39855ce: Introduce publishConfig in build.config.mjs
-   842e58a: Add support for (S)CSS

### Patch Changes

-   Updated dependencies [393b294]
-   Updated dependencies [454ea2b]
-   Updated dependencies [39855ce]
    -   @open-pioneer/build-common@0.3.0
    -   @open-pioneer/build-support@0.5.0

## 0.1.0

### Minor Changes

-   20004a8: First draft implementation for building packages.
