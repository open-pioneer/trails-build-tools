# cli-tests

Tests in this package use the `build-package-cli` to build some example real-world packages.

Before running the tests in this directory, make sure that the other packages have been built first,
e.g. by running `pnpm build` or `pnpm dev` and that the CLI is locally installed (`pnpm install`).
Otherwise, the tests will test old code or fail.

## Test setup

The packages tested here have been copied from real world projects.
The tests check that the packages can be compiled successfully and that the output matches the snapshots.
