# Resolve and generate `open-pioneer:test-support` in the Vite plugin

Status: ready-for-agent

Stage 3 of 6. Stop for review when done.

Blocked by: 01, 02

## Scope

In `packages/vite-plugin/src/codegen/shared.ts`:

- New virtual module type `test-support` with `packageDirectory` and `locale`.
- Serialized as `<packageDir>/@@open-pioneer-test-support?locale=<locale>`.
  Add the parse and serialize branches and extend `VIRTUAL_ID_FILTER` if the existing patterns do not match.
- Unit tests for parse and serialize next to the existing ones.

In `packages/vite-plugin/src/codegenPlugin.ts`:

- `resolveId`: for `"test-support"`, parse the query of the original id.
  Accept only `locale=<non-empty>`; any other parameter or an empty value throws a `ReportableError` that names the
  accepted form `open-pioneer:test-support?locale=<locale>`.
  Resolve to the serialized id with the importing package's directory from `getPackageDirectoryFromImporter`.
  When no locale is given, serialize without the query and pick the default at load time.
- `load`: get the app metadata for the package directory via `repository.getAppMetadata`.
  Determine the locale: the explicit one, or the first entry of the root package's `locales`.
  If the root package has no locales, throw `Package <name> does not define any i18n messages`.
  If the explicit locale is not in the root package's locales, throw an error that names the package and its
  declared locales.
  Call `generateI18nMessages` with `mode: "test"` and the same `loadI18n` callback as `app-i18n`.
  Do not call `validateI18nConfig`.
- Generated module: `export const testMessages = JSON.parse("...")` and
  `export const testMessagesLocale = "<locale>"`.
  Extend `generateI18nMessages` to take the export names, or add a sibling generator, whichever stays smaller.
  Do not emit a default export.

Fixture `packages/vite-plugin/test-data/codegen-test-support`:

- `packages/pkg-a` with `i18n: ["en", "de"]`, depending on `pkg-b` (`en` and `de`) and `pkg-c` (`en` only).
  `pkg-a/i18n/en.yaml` carries an `overrides` block for `pkg-b`, to prove it is ignored.
- `packages/pkg-no-i18n` without an `i18n` entry.
- Entry files that import the module, modelled on `codegen-i18n` and `codegen-react-hooks`.

Tests in `codegenPlugin.test.ts`, with `VITEST` set as it is during the test run:

- Default locale yields `en` messages for `pkg-a`, `pkg-b`, `pkg-c`, and `testMessagesLocale === "en"`.
- `?locale=de` yields `de` for `pkg-a` and `pkg-b`, nothing for `pkg-c`.
- `?locale=fr` fails naming `pkg-a` and `en, de`.
- Import from `pkg-no-i18n` fails with the "does not define any i18n messages" message.
- `?lang=de` and `?locale=` fail naming the accepted form.
- The override block in `pkg-a` does not change `pkg-b`'s messages.

## Out of scope

The test-run detection (stage 4), `client.d.ts`, changesets.

## Done when

The commands from stage 2 pass.
