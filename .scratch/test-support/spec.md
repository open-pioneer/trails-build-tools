# Virtual module `open-pioneer:test-support`

A virtual module that gives tests the i18n messages of the importing package and of its transitive Trails
dependencies, in the shape that the `PackageContextProvider` of `@open-pioneer/test-utils` takes as `messages`.

## Why

Component tests now render Trails components for real, so the placeholder message ids of the past are no longer
good enough.
The message files are YAML under `i18n/<locale>.yaml` and a test cannot import them in the right shape.

## Module contract

The module id is `open-pioneer:test-support`, optionally followed by `?locale=<message locale>`.
It exports two constants.

- `testMessages`: a record keyed by package name, then by message id, holding the message templates.
  It is assignable to the `messages` prop of the test-utils provider as is.
- `testMessagesLocale`: the message locale the messages were taken from.

`client.d.ts` declares both the plain id and the wildcard `open-pioneer:test-support?*`.
The type of `testMessages` is `Record<string, Record<string, string>>`.
The doc comment carries an `@example` that passes both exports to the provider.

## Locale rules

- The default locale is the first entry of the importing package's `i18n` array in its build config.
- An explicit `?locale=` value must appear in that array.
  Otherwise the plugin reports an error that names the package and its declared locales.
- An importing package without `i18n` fails with `Package <name> does not define any i18n messages`.
- Any query parameter other than `locale`, or an empty `locale`, is an error that names the accepted form
  `open-pioneer:test-support?locale=<locale>`.
- A dependency that declares i18n but has no file for the chosen locale contributes nothing.
  This is not an error.
- A YAML file that the build config declares but that is missing on disk is an error, as in the app path.

## Analysis

The importing package is the root of the dependency walk.
The plugin finds it from the importer's nearest `package.json`, the same way `open-pioneer:react-hooks` does, and
reuses `MetadataRepository.getAppMetadata` with that directory.
`generateI18nMessages` gets a `mode: "app" | "test"` option.
Test mode ignores an `overrides` block in every package, including the root, and tolerates dependencies without the
locale.
`validateI18nConfig` does not run for this module.
Watch files are propagated as in the app path, so Vitest watch mode re-runs tests when a YAML file changes.

## Test-only enforcement

The plugin treats the run as a test run when the environment variable `VITEST` equals `"true"`.
Outside a test run, `vite dev` and `vite build` both fail at the import with a `ReportableError` that says the module
may only be imported from tests.
This detection is a first draft, see issue 06.

The package compiler fails with a dedicated error when a compiled module imports `open-pioneer:test-support`.
The message says that the module may only be imported from tests and cannot be part of a published package.
The published package format does not change.

## Plumbing

- `RuntimeSupport.parseVirtualModule` returns a discriminated union, `{ type: "test-support", locale }` for this
  module, where `locale` is the value of the `locale` query parameter or undefined.
  It throws for any other query parameter, an empty locale, or an empty query.
  Every other id keeps the exact match and still throws when a query is present.
- Inside the plugin the module id is a magic filename next to the package,
  `<packageDir>/@@open-pioneer-test-support?locale=<locale>`, parsed and serialized in `codegen/shared.ts`.

## Tests

- Plugin fixture `codegen-test-support`: a package with locales `en` and `de`, two dependencies, one of them without
  `de`, plus a package without `i18n`.
  Cases: default locale, explicit locale, locale not declared by the importer, package without i18n, import outside
  a test run.
  The override handling of test mode is deliberately not covered by tests, since it may change.
- Compiler fixture `project-with-test-support-import`: the build fails with the dedicated error.

## Changesets

Minor for `@open-pioneer/vite-plugin-pioneer` and `@open-pioneer/build-common`, patch for
`@open-pioneer/build-package`.

## How the work is split

The issues under `issues/` are ordered stages.
Stop after each issue and wait for the author's review before starting the next one, so that a wrong turn is caught
before the next stage builds on it.
