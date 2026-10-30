# Debug logging, doc comments and final pass

Status: ready-for-agent
Type: task
Blocked by: 04

Spec: `.scratch/query-db/spec.md`, section "Observability" and the whole document for the final pass
Rules: `.scratch/query-db/issues/README.md`

Make the database observable and bring the module to the state in which it can be integrated later.

## Scope

Files to change: everything under `packages/vite-plugin/src/query-db/`.

Work to do:

- Debug logging through `createDebugger("open-pioneer:query-db")` from `../utils/debug`, guarded by the same
  `isDebug` pattern the rest of the plugin uses.
  Log when an entry recomputes, when it is verified fresh, when a recomputation produced an equal value, when a
  computation failed, and when a cycle is detected.
  Each line names the query and its parameters.
- Doc comments on the public types in `defineQuery.ts`, `Path.ts` and on the `QueryDb` class, following the writing
  rules in `AGENTS.md`.
  The known gap from the spec, that the database only sees inputs a query declares through the context, goes into the
  doc comment of `QueryContext`.
- Read the whole module top to bottom against the spec and the code style in `AGENTS.md`: file order, `#` private
  members, no inline types for the public API, no stale comments.
- Read the test files for duplicated setup and extract helpers to the bottom of the test file where it shortens the
  cases.
- List every place where the implementation deviates from the spec, and either update the spec or fix the code.
  Report the list in the final message.

## Checks

```
pnpm build
pnpm exec oxfmt packages/vite-plugin/src/query-db
pnpm exec oxlint packages/vite-plugin/src/query-db
pnpm check-types
pnpm exec vitest run packages/vite-plugin
```

## Review checkpoint

Stop after this issue.
The user reviews the module as a whole and decides on the integration into the plugin, which is a separate feature
with its own spec.
