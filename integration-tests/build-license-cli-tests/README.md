# cli-tests

Tests in this package use the `check-pnpm-duplicates-tests` CLI to check for duplicates in a lockfile.

Before running the tests in this directory, make sure that the other packages have been built first,
e.g. by running `pnpm build` or `pnpm dev` and that the CLI is locally installed (`pnpm install`).
Otherwise, the tests will test old code or fail.
