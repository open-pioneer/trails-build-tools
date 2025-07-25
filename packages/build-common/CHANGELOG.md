# Changelog @open-pioneer/build-common

## 3.1.0

### Minor Changes

- ba600ea: Update to zod v4.

### Patch Changes

- 340c415: Update dependencies

## 3.0.2

### Patch Changes

- 26cb9d8: Bump dependencies

## 3.0.1

### Patch Changes

- 23c031a: Bump dependencies
- 67ba039: Bump dependencies

## 3.0.0

### Major Changes

- 798ef0b: Requires minimum node version 20.

### Minor Changes

- 798ef0b: Update dependencies

## 2.0.5

### Patch Changes

- 2526935: Update dependencies
- 7668cd9: Update dependencies.

## 2.0.4

### Patch Changes

- d9a0c1b: Use timestamps instead of request ids to import build configs

## 2.0.3

### Patch Changes

- 017b8f3: Harmonize naming of Open Pioneer Trails in READMEs, package.json files and error messages.

## 2.0.2

### Patch Changes

- c08520d: Update zod-validation-error to 3.x
- c08520d: Update dependencies

## 2.0.1

### Patch Changes

- 715b45e: Update package.json metadata

## 2.0.0

### Major Changes

- 5601a5e: **Breaking Change:** Require Node >= 18

### Patch Changes

- 5601a5e: Bump dependencies

## 1.0.2

### Patch Changes

- 3a0fb62: Bump dependency 'semver' to 7.5.3
- 146743d: Bump dependencies

## 1.0.1

### Patch Changes

- 1a8c745: Redo release, 1.0.0 was released accidentally weeks ago.

## 1.0.0

### Major Changes

- 991be0f: Initial release

## 0.6.1

### Patch Changes

- f0cd283: Add package.json metadata

## 0.6.0

### Minor Changes

- b6f55fe: Move most package build options into the publishConfig section of build.config.mjs files.

### Patch Changes

- e6bbbfb: Simplify license comment in README

## 0.5.1

### Patch Changes

- fdb5347: Use unresolved module ids for generated code.

## 0.5.0

### Minor Changes

- 9f82090: Add some common helpers for runtime support, including generation of react hooks

## 0.4.0

### Minor Changes

- 348afd8: 'overrides' are now undefined in PackageConfig if the package does not user overrides at all (instead of an empty map).

### Patch Changes

- aeb702c: Add supported node versions (>= 16) to package.json

## 0.3.1

### Patch Changes

- 0692aa2: Revert back to commonjs

## 0.3.0

### Minor Changes

- 393b294: Distribute package as ESM.
- 454ea2b: Introduce new stable metadata format and move internal package representation into this package
- 39855ce: Introduce publishConfig in build.config.mjs

## 0.2.0

### Minor Changes

- ef54f35: Move loading of build config file into common package.
- 125fd57: Introduce support for entryPoints in build.config.mjs
- 37413f4: Add support for copying assets.

## 0.1.0

### Minor Changes

- 41399fa: Move validation of build.config.mjs into a shared package
