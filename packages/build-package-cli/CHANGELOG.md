# Changelog @open-pioneer/build-package-cli

## 3.0.7

### Patch Changes

- Updated dependencies [eac3ef4]
- Updated dependencies [19aa36f]
    - @open-pioneer/build-package@4.1.0

## 3.0.6

### Patch Changes

- 2c45a18: Bump dependencies
- Updated dependencies [2c45a18]
- Updated dependencies [1d5852a]
    - @open-pioneer/build-package@4.0.6

## 3.0.5

### Patch Changes

- f229f63: Bump dependencies
- Updated dependencies [f229f63]
    - @open-pioneer/build-package@4.0.5

## 3.0.4

### Patch Changes

- fe2e7d1: Update dependencies

## 3.0.3

### Patch Changes

- 340c415: Update dependencies
- Updated dependencies [340c415]
    - @open-pioneer/build-package@4.0.3

## 3.0.2

### Patch Changes

- 26cb9d8: Bump dependencies
- Updated dependencies [26cb9d8]
    - @open-pioneer/build-package@4.0.2

## 3.0.1

### Patch Changes

- 67ba039: Bump dependencies
- Updated dependencies [23c031a]
- Updated dependencies [23c031a]
- Updated dependencies [67ba039]
    - @open-pioneer/build-package@4.0.1

## 3.0.0

### Major Changes

- 798ef0b: Requires minimum node version 20.

### Minor Changes

- 798ef0b: Update dependencies

### Patch Changes

- Updated dependencies [798ef0b]
- Updated dependencies [798ef0b]
    - @open-pioneer/build-package@4.0.0

## 2.1.1

### Patch Changes

- Updated dependencies [2526935]
- Updated dependencies [7668cd9]
- Updated dependencies [7668cd9]
    - @open-pioneer/build-package@3.1.0

## 2.1.0

### Minor Changes

- e4ae880: Switch to `type: module`
- e4ae880: Implement additional validations when importing modules from other packages.
    - When importing modules from normal node packages, `build-package` will now check that the imported module actually exists.
    - When importing modules from another trails package in the same repository, `build-package` now verifies that the imported module is an actual entry point of that package (declared in the `build.config.mjs`).

    These validations are designed to errors where a package would run locally (in Vite's development mode)
    but end up broken when published (see also https://github.com/open-pioneer/trails-core-packages/issues/42).

- e4ae880: Introduce an option to configure the root directory (`-r` for the CLI, `rootDirectory` for the JavaScript API).

    The root directory is used to detect which packages are local to the project.
    The option defaults to the root of the current workspace (e.g. the PNPM workspace root), or, if that doesn't work, to the root of the current git repository.
    However, it can also be configured manually.

### Patch Changes

- 3550ca8: Update dependencies
- Updated dependencies [e4ae880]
- Updated dependencies [e4ae880]
- Updated dependencies [3550ca8]
- Updated dependencies [e4ae880]
- Updated dependencies [e4ae880]
    - @open-pioneer/build-package@3.0.0

## 2.0.3

### Patch Changes

- 017b8f3: Harmonize naming of Open Pioneer Trails in READMEs, package.json files and error messages.
- Updated dependencies [017b8f3]
    - @open-pioneer/build-package@2.0.3

## 2.0.2

### Patch Changes

- c08520d: Update dependencies
- Updated dependencies [c08520d]
- Updated dependencies [c08520d]
    - @open-pioneer/build-package@2.0.2

## 2.0.1

### Patch Changes

- 715b45e: Update package.json metadata
- Updated dependencies [9d4a9d5]
- Updated dependencies [715b45e]
    - @open-pioneer/build-package@2.0.1

## 2.0.0

### Major Changes

- 5601a5e: **Breaking Change:** Require Node >= 18

### Patch Changes

- 5601a5e: Bump dependencies
- Updated dependencies [5601a5e]
- Updated dependencies [5601a5e]
    - @open-pioneer/build-package@2.0.0

## 1.0.4

### Patch Changes

- Updated dependencies [c62a32b]
    - @open-pioneer/build-package@1.0.4

## 1.0.3

### Patch Changes

- Updated dependencies [adcd8b9]
    - @open-pioneer/build-package@1.0.3

## 1.0.2

### Patch Changes

- 146743d: Bump dependencies
- Updated dependencies [146743d]
    - @open-pioneer/build-package@1.0.2

## 1.0.1

### Patch Changes

- @open-pioneer/build-package@1.0.1

## 1.0.0

### Major Changes

- 991be0f: Initial release

### Patch Changes

- Updated dependencies [991be0f]
    - @open-pioneer/build-package@1.0.0

## 0.2.3

### Patch Changes

- Updated dependencies [763acf3]
    - @open-pioneer/build-package@0.7.3

## 0.2.2

### Patch Changes

- Updated dependencies [766bcb8]
    - @open-pioneer/build-package@0.7.2

## 0.2.1

### Patch Changes

- f0cd283: Add package.json metadata
- Updated dependencies [f0cd283]
    - @open-pioneer/build-package@0.7.1

## 0.2.0

### Minor Changes

- 8c6e72d: Rename to build-pioneer-package

## 0.1.0

### Minor Changes

- e6bbbfb: Create package

### Patch Changes

- e6bbbfb: Simplify license comment in README
- Updated dependencies [b6f55fe]
- Updated dependencies [e6bbbfb]
- Updated dependencies [e6bbbfb]
    - @open-pioneer/build-package@0.7.0
