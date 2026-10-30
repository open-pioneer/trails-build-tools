# Query inputs, context guards and cycle detection

Status: done
Type: task
Blocked by: 01

Spec: `.scratch/query-db/spec.md`, sections "Public API", "Freshness and verification" (input recording only) and
"Concurrency"
Rules: `.scratch/query-db/issues/README.md`

Let queries read other queries through the context, record the inputs, and enforce the rules about where a context and
the database may be used.

## Scope

Files to change: `QueryDb.ts`, `defineQuery.ts` and their tests.

Behavior to implement:

- `ctx.get(query, params)` reads another entry with the same caching and joining rules as `QueryDb.get`.
  Each call records the target entry as an input of the calling entry, in call order.
  The recorded inputs are visible to tests through a test-only accessor or through observable behavior, whichever is
  simpler.
- Every computation runs in its own `AsyncLocalStorage` scope that holds the active computation.
  `QueryDb.get` throws when a scope is active.
  Every context method throws when the context does not belong to the active computation, and when the context's
  computation has already finished.
- Readers may call `QueryDb.get` concurrently for different and for the same query keys.
  A query body may request several inputs with `Promise.all`.
  Both are covered by tests that use manually resolved promises inside the test queries.
- Cycle detection: each running computation records the entry it is currently waiting on.
  A `ctx.get` that would make a computation wait on itself, directly or through other waiting computations, throws an
  `Error` whose message lists the chain as `Name(params) -> Name(params) -> ...`.
  The error is stored as the failure of the entry that closed the cycle.
- A failure in an input propagates: the calling query sees the original error object rethrown from `ctx.get`.

Out of scope: file operations, invalidation, revisions, watch files, warnings, debug logging.

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
The user reviews how the active computation is represented, how inputs are recorded, and the cycle error before
invalidation is built on the same structures.
