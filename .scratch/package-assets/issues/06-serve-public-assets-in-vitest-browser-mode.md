# Serve public assets in Vitest browser mode

Status: ready-for-agent
Issue: #60
Blocked by: 05

Spec: `.scratch/package-assets/spec.md`, sections "Dev server" and "Open points".

Projects run tests of packages with public assets in Vitest browser mode (Chromium through Playwright).
Some third party libraries start classic workers that load their chunks with `importScripts()`, so the files must
come from plain HTTP URLs.
Today such tests override the asset URLs by hand.
Goal: a test that imports a Trails package gets working URLs from `open-pioneer:assets` without any setup.

## Step 1: check, before writing code

It is not verified that Vitest's browser server runs a middleware that a project plugin registers in
`configureServer`, nor which `base` and origin the test page uses.
Find out with the installed Vitest (see the catalog) by reading its source under `node_modules` and by a throwaway
project in `temp/`.
Write the answer under `## Comments` in this file before continuing.

If the middleware does not run there, stop, set `Status: needs-info`, and describe the options you found.
Do not work around it with `/@fs/` URLs: Vite transforms those, which breaks `importScripts()`.

## Step 2: scope

- In a test run (`isTestRun` in `codegenPlugin.ts`), loading `\0open-pioneer:assets?package=<name>` must make the
  package's public assets servable. No app is analyzed in a test run, so the repository has not loaded the package.
    - Plain import from a source package: analyze the graph of the importing package with
      `repository.getTestSupportMetadata(ctx, packageDirectory)`, which loads the graph into the repository.
      The package directory is known in `resolveId`. Carry it to `load` or analyze in `resolveId`, whichever keeps
      the id format of ticket 04 unchanged.
    - Query form from a published package: the declaring package's directory is not known from the id.
      Published packages reach a test through the graph of the source package under test, so the analysis above
      covers them once that package or one of its dependents imports the module.
      If step 1 or a test shows a case this misses, describe it in the comments and propose a fix. Do not guess.
- `open-pioneer:deployment` in dev emits `new URL(base, window.origin)`. Keep that. In a node or jsdom environment
  without a usable origin the import behaves as `open-pioneer:deployment` does today. Do not add a fallback.
- The middleware and the URL prefix stay as they are.

## Tests

Extend the `vitest` describe block in `codegenPlugin.test.ts`, which runs `startVitest` against a fixture.
New fixture with a source package that has public assets and a test that fetches
`getPublicAssetUrl("<file>")` and asserts the body.

Browser mode needs a browser binary. Check what the repository's CI can run.
If no browser is available there, cover the analysis with a non-browser test that asserts `repository.getLoadedPackage(name)`
after the module was loaded, and say in the comments what remains for the manual check in ticket 10.

## Done when

`pnpm build`, `pnpm check-types`, `pnpm exec oxlint packages/vite-plugin` and
`pnpm exec vitest run packages/vite-plugin` pass, and the findings of step 1 are written down in this file.
