# Scaffold the query database with single-level caching

Status: ready-for-agent
Type: task

Spec: `.scratch/query-db/spec.md`
Rules: `.scratch/query-db/issues/README.md`

Create the module and the public API, and make `QueryDb.get` cache values by query key.
Nothing is invalidated yet, and queries cannot read other queries or files yet.

## Scope

Files to create:

- `packages/vite-plugin/src/query-db/Path.ts`: the branded `Path` type and `toPath`.
- `packages/vite-plugin/src/query-db/defineQuery.ts`: `defineQuery`, `Query`, `QueryOptions`, `QueryContext`, `Reader`
  and the `JsonValue` type for parameters.
  `QueryContext` already declares every method from the spec.
  The methods that are not implemented yet throw an `Error` saying so.
- `packages/vite-plugin/src/query-db/QueryDb.ts`: the `QueryDb` class with `get`, `fileChanged` and `clear`.
  `fileChanged` is a no-op in this issue.
- Tests next to each file.

Files to change:

- `pnpm-workspace.yaml`: add `fast-equals` to the `catalog:` section.
- `packages/vite-plugin/package.json`: add `fast-equals` as a dependency with `catalog:`.
  Run `pnpm install` afterwards.

Behavior to implement:

- Entries are stored per query, lazily, then by the canonical serialization of the parameters with sorted object keys.
- A first `get` runs the query function with a context and stores the value.
  A second `get` with structurally equal parameters returns the stored value without running the query.
- A `get` while the query function is still running joins the running job.
- A query that throws stores the failure.
  Later reads rethrow the same error object without running the query again.
- `clear()` empties the database.
  A job that is running when `clear()` is called finishes for its waiters, and its result is not stored.
- `equals` is accepted in `QueryOptions` and defaults to `deepEqual` from `fast-equals`.
  It is stored on the query and not used yet.
- `get` always returns a promise.

Out of scope: `ctx.get`, file operations, `AsyncLocalStorage`, watch files, warnings, revisions, debug logging.

## Checks

```
pnpm build
pnpm exec oxfmt packages/vite-plugin/src/query-db
pnpm exec oxlint packages/vite-plugin/src/query-db
pnpm check-types
pnpm exec vitest run packages/vite-plugin/src/query-db
```

## Review checkpoint

Stop after this issue.
The user reviews the module layout, the names of the public types, the shape of the stored entry, and the test style
before any of the tracking logic is built on top.
