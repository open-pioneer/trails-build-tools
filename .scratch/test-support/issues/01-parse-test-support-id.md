# Teach build-common and the compiler about `open-pioneer:test-support`

Status: done

Stage 1 of 6. Stop for review when done.

## Scope

In `packages/build-common/src/runtimeSupport/index.ts`:

- `parseVirtualModule` returns a discriminated union `VirtualModule` instead of a string.
  `{ type: "test-support", locale }` carries the `locale` query parameter, or undefined without a query.
  Any other parameter, an empty locale or an empty query throws
  `Invalid query in module id '<id>'. Expected 'open-pioneer:test-support?locale=<locale>'.`
  Every other id keeps the exact string match, so `open-pioneer:app?x` still throws `Unsupported module id`.
- Update the callers in `codegenPlugin.ts` and `rollup/virtualModules.ts` to switch on `.type`.
- Extend `index.test.ts` with cases for the plain id, the id with a locale, the invalid queries, and a different id
  with a query.

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
