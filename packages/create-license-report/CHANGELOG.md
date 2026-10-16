# @open-pioneer/create-license-report

## 0.1.0

### Minor Changes

- 32fdaaa: New package `@open-pioneer/create-license-report` with the `create-license-report` command.
  It collects the licenses of a project's dependencies via `pnpm licenses list` and writes them to an HTML report.
  The tool requires pnpm 11 or later.

    - Dev dependencies are skipped by default. Set `skipDevDependencies: false` in `license-config.yaml` to include them.
    - `allowedLicenses` accepts compound SPDX license expressions such as `MIT AND BSD-3-Clause`.
    - `OR` expressions are rejected until the choice is made explicit through `overrideLicenses` or `allowedLicenses`.

### Patch Changes

- 32fdaaa: Extract common functionality into @open-pioneer/cli-common
- Updated dependencies [32fdaaa]
- Updated dependencies [32fdaaa]
    - @open-pioneer/cli-common@0.1.0
