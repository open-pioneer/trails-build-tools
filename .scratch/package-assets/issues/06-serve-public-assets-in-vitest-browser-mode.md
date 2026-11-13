# Serve public assets in Vitest browser mode

Status: done
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

- In a test run (`isTestRun` in `codegenPlugin.ts`), loading `<packageDirectory>/@@open-pioneer-assets` must make the
  package's public assets servable. No app is analyzed in a test run, so the repository has not loaded the package.
  Analyze the graph of the package in the id with `repository.getTestSupportMetadata(ctx, packageDirectory)`, which
  loads the graph into the repository.
  The id carries the package directory for source and published packages alike.
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

## Comments

### Step 1: Vitest browser server (Vitest 5.0.5, `@vitest/browser` 5.0.5)

The middleware runs.
Vitest 5 serves browser tests from one shared Vite server per project cluster (`createClusterServer` in
`vitest/dist/chunks/index.*.js`).
That server is created from the project's Vite config, so our `configureServer` registers the middleware on it.
The browser contribution adds its own middlewares in a `configureServer` hook with `order: "pre"`, so they run
before ours.
None of them handles a path below `/@package-assets/`.
They match the orchestrator and tester URLs, `/favicon.svg`, `/__vitest_attachment__`, `/__vitest__` and the
coverage directory, and otherwise call `next()`.

The test page is served at `${base}__vitest_test__/` by that same server, where `base` is the resolved `base` of the
Vite config.
`window.origin` is therefore the origin of the server that runs the middleware, and `new URL(base, window.origin)`
points to it.

A run in a real browser was not possible in the sandbox.
The Playwright Chromium download needs a network approval for `storage.googleapis.com`.

### Tests

CI runs `pnpm ci:test` on `ubuntu-latest` without a browser install step, and the repository has no
`@vitest/browser-playwright`.
The new case in the `vitest` describe block of `codegenPlugin.test.ts` therefore runs the fixture
`test-data/vitest-public-assets` in the node environment.
It starts Vitest with `api.port` set, so Vitest's own server listens, and passes the server origin to the fixture with
`provide()`.
The fixture sets `window.origin`, imports `open-pioneer:assets` and fetches `getPublicAssetUrl("hello.txt")`.
This covers the load hook, the graph analysis and the middleware on Vitest's server.
Without the analysis in the load hook the fetch gets a 404.

Left for the manual check in ticket 10: a browser test in a real project that loads a file with `importScripts()`
from a classic worker.

### Cases the scope does not cover

- A package without `build.config.mjs` that imports `open-pioneer:assets` in a test run is an error, because it has
  no public assets.
  `getTestSupportMetadata` is renamed to `getDependencyGraph` and takes the imported module, so the message names
  `open-pioneer:assets`.
  The fixture `codegen-assets-plain-importer` covers it.
- A published package whose import of `open-pioneer:assets` goes through the dependency optimizer resolves only
  after ticket 07 adds the optimizer rewrite to the internal id.
  The load hook then analyzes the package the same way.
