# Changelog @open-pioneer/build-package

## 4.0.1

### Patch Changes

- 23c031a: Bump dependencies
- 23c031a: Hide rollup warnings when a module contains 'use client' directives.

    NOTE: These directives may currently be dropped during the build.
    This is not a problem in practice (at this time) because we only use client components anyway.

- 67ba039: Bump dependencies
- Updated dependencies [23c031a]
- Updated dependencies [67ba039]
    - @open-pioneer/build-common@3.0.1
    - @open-pioneer/build-support@3.0.1

## 4.0.0

### Major Changes

- 798ef0b: Requires minimum node version 20.

### Minor Changes

- 798ef0b: Update dependencies

### Patch Changes

- Updated dependencies [798ef0b]
- Updated dependencies [798ef0b]
    - @open-pioneer/build-support@3.0.0
    - @open-pioneer/build-common@3.0.0

## 3.1.0

### Minor Changes

- 7668cd9: Use the new `noCheck` option when generation TypeScript declaration files (.d.ts). This can speed up the generation process, since typechecking is done during the main compilation (linting) stage.
  This change may require updating TypeScript to a reject version.

### Patch Changes

- 2526935: Update dependencies
- 7668cd9: Update dependencies.
- Updated dependencies [2526935]
- Updated dependencies [7668cd9]
    - @open-pioneer/build-common@2.0.5

## 3.0.0

### Major Changes

- e4ae880: Switch to `type: module`

### Minor Changes

- e4ae880: Implement additional validations when importing modules from other packages.

    - When importing modules from normal node packages, `build-package` will now check that the imported module actually exists.
    - When importing modules from another trails package in the same repository, `build-package` now verifies that the imported module is an actual entry point of that package (declared in the `build.config.mjs`).

    These validations are designed to errors where a package would run locally (in Vite's development mode)
    but end up broken when published (see also https://github.com/open-pioneer/trails-core-packages/issues/42).

- e4ae880: Implement automatic rewrite for certain problematic import statements.

    Under certain conditions, `build-package` will add extensions to imported modules when the imported module does not (strictly) exist.
    For example, this rewrites

    ```js
    import * from "ol/proj/proj4";
    ```

    to

    ```js
    import * from "ol/proj/proj4.js";
    ```

    While the first import works with bundlers such as Vite or Rollup, Node will refuse to import it.
    Because node is strict about extensions, the first snippet cannot execute in some environments (such as Vitest).

    This new behavior is intended as a fix for https://github.com/open-pioneer/trails-openlayers-base-packages/issues/314.
    Please open an issue if this fix causes any problems for your packages.

- e4ae880: Introduce an option to configure the root directory (`-r` for the CLI, `rootDirectory` for the JavaScript API).

    The root directory is used to detect which packages are local to the project.
    The option defaults to the root of the current workspace (e.g. the PNPM workspace root), or, if that doesn't work, to the root of the current git repository.
    However, it can also be configured manually.

### Patch Changes

- 3550ca8: Update dependencies
- Updated dependencies [d9a0c1b]
    - @open-pioneer/build-common@2.0.4

## 2.0.3

### Patch Changes

- 017b8f3: Harmonize naming of Open Pioneer Trails in READMEs, package.json files and error messages.
- Updated dependencies [017b8f3]
    - @open-pioneer/build-support@2.0.2
    - @open-pioneer/build-common@2.0.3

## 2.0.2

### Patch Changes

- c08520d: Update dependencies
- c08520d: Update postcss to 16.x
- Updated dependencies [c08520d]
- Updated dependencies [c08520d]
    - @open-pioneer/build-common@2.0.2

## 2.0.1

### Patch Changes

- 9d4a9d5: Bump dependencies
- 715b45e: Update package.json metadata
- Updated dependencies [715b45e]
    - @open-pioneer/build-support@2.0.1
    - @open-pioneer/build-common@2.0.1

## 2.0.0

### Major Changes

- 5601a5e: **Breaking Change:** Require Node >= 18

### Patch Changes

- 5601a5e: Bump dependencies
- Updated dependencies [5601a5e]
- Updated dependencies [5601a5e]
    - @open-pioneer/build-common@2.0.0
    - @open-pioneer/build-support@2.0.0

## 1.0.4

### Patch Changes

- c62a32b: Restore compatibility with older sass versions

## 1.0.3

### Patch Changes

- adcd8b9: Don't use deprecated default export of sass package

## 1.0.2

### Patch Changes

- 146743d: Bump dependencies
- Updated dependencies [3a0fb62]
- Updated dependencies [146743d]
    - @open-pioneer/build-common@1.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [1a8c745]
    - @open-pioneer/build-common@1.0.1

## 1.0.0

### Major Changes

- 991be0f: Initial release

### Patch Changes

- Updated dependencies [991be0f]
    - @open-pioneer/build-common@1.0.0
    - @open-pioneer/build-support@1.0.0

## 0.7.3

### Patch Changes

- 763acf3: Disable 'declarationMap' for published packages

## 0.7.2

### Patch Changes

- 766bcb8: Make more errors non-fatal when 'strict' is disabled

## 0.7.1

### Patch Changes

- f0cd283: Add package.json metadata
- Updated dependencies [f0cd283]
    - @open-pioneer/build-support@0.6.1
    - @open-pioneer/build-common@0.6.1

## 0.7.0

### Minor Changes

- b6f55fe: Move most package build options into the publishConfig section of build.config.mjs files.
- e6bbbfb: Change the way output is configured in the 'build' function. A logger (e.g. console) can now be passed directly.

### Patch Changes

- e6bbbfb: Simplify license comment in README
- Updated dependencies [b6f55fe]
- Updated dependencies [e6bbbfb]
    - @open-pioneer/build-common@0.6.0
    - @open-pioneer/build-support@0.6.0

## 0.6.2

### Patch Changes

- Updated dependencies [fdb5347]
    - @open-pioneer/build-common@0.5.1

## 0.6.1

### Patch Changes

- f83172b: Fix reporting of TypeScript errors.

## 0.6.0

### Minor Changes

- e30bf30: Implement generation of TypeScript declaration files (.d.ts).

## 0.5.2

### Patch Changes

- 4942738: Simplify source map paths. Source files appear as if they were files within the built package.

## 0.5.1

### Patch Changes

- 17b58a7: Fix usage of sass package.
- 45866f0: Improve logging

## 0.5.0

### Minor Changes

- 9f82090: Transpile open-pioneer:react-hooks at build time to avoid problems in the toolchain, e.g. when esbuild preoptimizes dependencies in vite.
- 9f82090: Ensure that a package always imports its external dependencies.

### Patch Changes

- ac2b275: Import chalk using async import
- Updated dependencies [9f82090]
    - @open-pioneer/build-common@0.5.0

## 0.4.0

### Minor Changes

- 1273a16: Copy i18n files when present

### Patch Changes

- aeb702c: Add supported node versions (>= 16) to package.json
- Updated dependencies [348afd8]
- Updated dependencies [aeb702c]
    - @open-pioneer/build-common@0.4.0
    - @open-pioneer/build-support@0.5.2

## 0.3.1

### Patch Changes

- 0a68001: Fix source map paths on windows

## 0.3.0

### Minor Changes

- fdc4cae: Fix dependency to postcss-import

## 0.2.2

### Patch Changes

- 0692aa2: Revert back to commonjs
- Updated dependencies [0692aa2]
    - @open-pioneer/build-support@0.5.1
    - @open-pioneer/build-common@0.3.1

## 0.2.1

### Patch Changes

- 003324e: Redo release

## 0.2.0

### Minor Changes

- 393b294: Distribute package as ESM.
- 5ea5830: Use stable metadata format
- ceffb16: Add 'sourceMaps' and 'strict' parameters to `build()` API
- a3c4609: Generate package.json and copy auxiliary files (README, LICENSE etc.) from source package.
- 39855ce: Introduce publishConfig in build.config.mjs
- 842e58a: Add support for (S)CSS

### Patch Changes

- Updated dependencies [393b294]
- Updated dependencies [454ea2b]
- Updated dependencies [39855ce]
    - @open-pioneer/build-common@0.3.0
    - @open-pioneer/build-support@0.5.0

## 0.1.0

### Minor Changes

- 20004a8: First draft implementation for building packages.
