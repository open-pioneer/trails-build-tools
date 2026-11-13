# Cover the CLI and update the documentation

Status: ready-for-agent
Issue: #60
Blocked by: 08

Spec: `.scratch/package-assets/spec.md`.

The feature works end to end after ticket 08.
This ticket proves it through the built CLI and brings the written documentation in line.

## Scope

### Integration test

`integration-tests/build-package-cli-tests`: add a package with public assets to `test-data/`, with one local
directory and one dependency directory, and compile it with the built CLI like the existing cases.
Snapshot the log output, the list of files in `dist`, and the generated `package.json`.
Run `pnpm build && pnpm install` first, otherwise the test runs a stale CLI.

### Round trip

One test in `packages/vite-plugin` that consumes a package in the shape the compiler produces.
Copy the compiled output of the ticket 08 fixture by hand into a vite-plugin fixture as a published package.
Do not make the vite-plugin tests depend on running the compiler.
Skip this if the fixture of ticket 07 already has exactly that shape, and say so in the comments.

### Documentation

- `AGENTS.md`: the step order sentence in "How the pieces fit" gets the public assets step. Add one or two sentences
  on how the plugin serves and copies public assets. Add `publicAssets/` to nothing in the folder tree unless a
  listed line becomes wrong.
- `packages/build-package-cli/README.md`: the step log example.
- `packages/vite-plugin/README.md`: a short section "Public assets" under "Features": what a package declares, how
  code gets the URL, that the dev server serves lazily and the build copies, and that the URL layout is not an API.
- `packages/build-support/src/index.ts` and `packages/vite-plugin/client.d.ts`: read the doc comments once more
  against the implemented behavior and fix what drifted.
- `CONTEXT.md`: same check for "Public asset", "Public asset directory", "Virtual module".
- Follow "Formatting rendered prose" in `AGENTS.md`: one sentence per line.

### Changeset

`pnpm changeset` for every published package that changed. Write the summaries for consumers.
`build-support`, `build-common`, `vite-plugin`, `build-package` and `build-package-cli` get a minor bump.

## Done when

`pnpm ci:test` passes.
