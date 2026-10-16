# Declare the module types and add changesets

Status: done

Stage 5 of 6. Stop for review when done.

Blocked by: 04

## Scope

In `packages/vite-plugin/client.d.ts`:

- `declare module "open-pioneer:test-support"` and `declare module "open-pioneer:test-support?*"` exporting
  `testMessages: Record<string, Record<string, string>>` and `testMessagesLocale: string`.
- Doc comment following the rules for published types: what the module is for, that it is test-only, the locale
  rules, and an `@example` that renders a component inside `PackageContextProvider` with
  `messages={testMessages}` and `locale={testMessagesLocale}`.
  Mention the `?locale=` form in a second `@example`.
  The wildcard declaration can refer the reader to the plain one.

Changesets (`pnpm changeset` or files under `.changeset/`):

- `@open-pioneer/vite-plugin-pioneer` minor: describe the new module and its two exports for the consumer.
- `@open-pioneer/build-common` minor: `parseVirtualModule` recognises `open-pioneer:test-support`.
- `@open-pioneer/build-package` patch: the compiler rejects imports of `open-pioneer:test-support`.

Check whether the plugin README lists virtual modules anywhere.
It did not at the time of writing, so no README change is expected.

## Done when

`pnpm ci:test` passes.
