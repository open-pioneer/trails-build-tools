# Serve public assets from the dev server

Status: done
Issue: #60
Blocked by: 02

Spec: `.scratch/package-assets/spec.md`, sections "Dev server" and "Design > vite-plugin".

After ticket 02 every `AnalyzedPackage` knows its public asset directories.
This ticket serves them at `<base>@package-assets/<packageSlug>/<path>`.
The virtual module does not exist yet, so tests request URLs directly.

## Scope

New folder `packages/vite-plugin/src/publicAssets/`, wired from `codegenPlugin.ts` in the way
`src/deployment/index.ts` is wired.

- **Package lookup**: `MetadataRepository.getLoadedPackage(packageName)` returns a Trails package from the
  repository's index by name, which the duplicate check already keeps.
  It does not load anything, because a package's location is only known from a dependency graph.
  The middleware calls it on each request and serves the `publicAssets` of the result.
- **Middleware**: a `configureServer(server)` hook in `codegenPlugin` calls `server.middlewares.use(handler)` directly.
  Do not return a post hook. One handler for all packages, no route per directory.
    1. Ignore methods other than GET and HEAD and URLs outside the prefix by calling `next()`.
       The prefix is `<base>@package-assets/`, where a `base` of `""` or `"./"` counts as `/`.
       Export the segment `@package-assets` as a constant. Ticket 04 needs it.
    2. Strip query and hash, decode with `decodeURI` in a try/catch (400 on failure).
    3. The first segment is the package slug. `slugToPackageName` in `src/publicAssets/packageSlug.ts` turns it into
       the package name, `packageNameToSlug` is the reverse. Ticket 04 needs the latter.
    4. Respond 404 if the package is not loaded, or if any segment below `dest` starts with `.`.
    5. Walk the package's directories from the first to the last, so the entry declared first wins.
       An entry matches if `dest` is `""` or the remaining path starts with `dest + "/"`.
       Call that directory's `sirv` handler with `req.url` set to the path below `dest`.
       The handler's `next` callback tries the following entry.
    6. Respond 404 when no entry is left. Never call the outer `next()` for a URL below the prefix.
- **sirv**: `sirv(directory, { dev: true, etag: true, extensions: [] })`, created on first use and kept in a map by
  directory. Add `sirv` to the catalog in `pnpm-workspace.yaml` and to the plugin's `dependencies`.
  Mind `resolutionMode: lowest-direct` and `minimumReleaseAge` when choosing the range.
- No directory scan, no watcher, no `fs` call outside sirv.
- A public asset directory may lie outside its package (ticket 02). Serve it like any other.
  The traversal guard applies to the request path below a registered directory, never to where that directory is.
  Do not apply Vite's `server.fs.allow` check.

## Tests

New test file next to the code. Start a real server with `createServer` from `vite` on the fixture
`test-data/codegen-public-assets` (port 0, `server.listen()`, close in `afterAll`), load the app once so the graph is
analyzed, then `fetch`:

- an existing file: 200, body, content type, ETag
- the same file with `If-None-Match`: 304
- a file in the nested `dest` (`third-party-lib/...`)
- fall-through: a file below the deeper `dest` that exists only in the entry declared later
- precedence: a file that exists in two entries is served from the entry declared first
- a missing file: 404 and not the content of `index.html`, also with `Accept: text/html`
- `.hidden` and a path with a dot directory: 404
- `..%2f` and `%2e%2e/` traversal attempts: 404 or 400, never a file from outside
- an unknown package name: 404
- a scoped package name, if the fixture has one. Add one if not.

The test triggers the graph analysis by resolving and loading `open-pioneer:app` through the client environment's
plugin container.

## Done when

`pnpm build`, `pnpm check-types`, `pnpm exec oxlint packages/vite-plugin` and
`pnpm exec vitest run packages/vite-plugin` pass.
