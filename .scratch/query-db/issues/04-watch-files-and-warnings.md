# Deliver watch files and warnings to readers

Status: ready-for-agent
Type: task
Blocked by: 03

Spec: `.scratch/query-db/spec.md`, section "Watch files and warnings"
Rules: `.scratch/query-db/issues/README.md`

Readers receive the files and warnings behind a value, both for stored values and while a computation is running.

## Scope

Files to change: `QueryDb.ts`, `defineQuery.ts` and their tests.

Behavior to implement:

- The optional `Reader` argument of `QueryDb.get` with `addWatchFile(path)` and `warn(message)`, both optional.
- Every entry stores the set of paths declared by its own file operations and, transitively, by its query inputs, and
  the warnings recorded by `ctx.warn` the same way.
- A read that returns a stored value, fresh or verified fresh, replays the paths and warnings to the reader
  synchronously inside the `get` call, before the promise resolves.
- A running job keeps the list of readers waiting for it.
  A path or warning declared during the computation, at any depth of `ctx.get`, is pushed to every waiting reader at
  once.
  A reader that joins later first receives everything declared so far, then everything that follows.
- `readFile` and `fileExists` push the path before they touch the file system.
- Readers that pass no `Reader`, or a `Reader` without one of the methods, work unchanged.

Tests to include, at least:

- A cached return replays the paths of a three-query chain.
- Two readers join one running computation at different times and both end with the same set of paths.
- The path reaches the reader before the file is read, using a test query that observes the order.
- A warning recorded in a nested query reaches a reader on the first and on a cached read.

Out of scope: debug logging.

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
The user reviews the reader interface and the delivery timing against what the plugin's `load` hook needs.
