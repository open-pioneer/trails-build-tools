# File inputs, revisions and verification

Status: done
Type: task
Blocked by: 02

Spec: `.scratch/query-db/spec.md`, sections "File inputs", "Freshness and verification" and "Concurrency"
Rules: `.scratch/query-db/issues/README.md`

This is the core of the design: files enter the database as leaf entries, `fileChanged` invalidates from the bottom
up, and a read recomputes only what actually changed.

## Scope

Files to change: `QueryDb.ts`, `defineQuery.ts`, the new `FileSystem.ts` and their tests.
The file operations go through a `FileSystem` interface passed to the constructor, with the real file system as the
default.
Tests use an in-memory implementation defined in the test file and do not touch `test-data/` or `temp/`.

Behavior to implement:

- `ctx.readFile(path)`, `ctx.fileExists(path)` and `ctx.watchFile(path)` as built-in leaf entries keyed by operation
  and path.
  `readFile` stores the UTF-8 text, a missing file is a stored failure.
  `fileExists` stores a boolean.
  `watchFile` stores the revision at which the file was last reported and never cuts off.
  All three take a `Path`.
- A global revision counter that `fileChanged` bumps.
  Throw a plain `Error` when it reaches `Number.MAX_SAFE_INTEGER`.
- `verifiedAt` and `changedAt` on every entry, the recorded inputs in request order, and a reverse index from an entry
  to the entries that use it.
  The reverse index of an entry is rebuilt after every recomputation.
- `fileChanged(path)` marks the leaves of the path stale and every transitive dependent maybe stale, without
  recomputing anything.
- A read of a maybe stale entry verifies its inputs in recorded order, one at a time, verifying each input first.
  An input counts as changed when its `changedAt` is greater than the entry's `verifiedAt`.
  At the first changed input the entry recomputes.
  When no input changed, `verifiedAt` moves to the current revision and the stored value is returned.
- Early cut-off: when a recomputation produces a value that `equals` says matches the old one, the old value and
  `changedAt` stay, and the entries above are not recomputed.
  A failed entry is never equal to a previous value.
- A stale `readFile` or `fileExists` leaf re-runs the operation on verification and compares the result, so a save
  without a content change recomputes nothing above the leaf.
- Verification and recomputation of one entry share one job that concurrent readers join.
- `fileChanged` for a file that a running computation already declared lets the computation finish, delivers the result
  to every waiter, and stores the entry as maybe stale.

Tests to include, at least:

- A chain of three queries over one file, where editing the file recomputes all three, a `touch` recomputes only the
  leaf, and a change that leaves the middle value equal recomputes the leaf and the middle query but not the top.
- A query whose second input is only requested because of the first input's result, showing that verification stops at
  the first changed input.
- A `fileChanged` during a running computation.
- Two readers hitting a maybe stale entry at the same time run one verification.

Out of scope: watch file and warning delivery to readers, debug logging.

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
The user reviews the verification algorithm, the entry state machine and the leaf design.
This is the checkpoint where a change of direction is most likely, so report anything in the spec that did not hold up
during implementation.
