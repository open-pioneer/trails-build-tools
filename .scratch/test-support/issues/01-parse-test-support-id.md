# Teach build-common and the compiler about `open-pioneer:test-support`

Status: ready-for-agent

Stage 1 of 6. Stop for review when done.

## Scope

In `packages/build-common/src/runtimeSupport/index.ts`:

- Add `"test-support"` to `VirtualModuleType`.
- `parseVirtualModule` returns `"test-support"` for `open-pioneer:test-support` and for `open-pioneer:test-support?<anything>`.
  Every other id keeps the exact string match, so `open-pioneer:app?x` still throws `Unsupported module id`.
  The query is not interpreted here; the plugin reads it.
- Extend `index.test.ts` with cases for the plain id, the id with a query, and a different id with a query.

In `packages/build-package/src/rollup/virtualModules.ts`:

- Add a `case "test-support"` that calls `this.error` with:
  `'open-pioneer:test-support' may only be imported from tests and cannot be part of a published package.`
  Keep the `default` branch for future ids.
- Add fixture `packages/build-package/test-data/project-with-test-support-import` (copy the shape of
  `project-with-deployment-import`) whose entry point imports `open-pioneer:test-support`.
- Add a test in `buildJs.test.ts` next to the deployment cases that expects the error, with an inline snapshot.

## Out of scope

Nothing in the plugin, `client.d.ts` or changesets.

## Done when

`pnpm build`, `pnpm check-types`, `pnpm exec oxlint packages/build-common packages/build-package` and
`pnpm exec vitest run packages/build-common packages/build-package` pass.
