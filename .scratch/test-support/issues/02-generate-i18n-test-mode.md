# Add a test mode to `generateI18nMessages`

Status: done

Stage 2 of 6. Stop for review when done.

## Scope

In `packages/vite-plugin/src/codegen/generateI18n.ts`:

- `I18nMessageOptions` gets `mode: "app" | "test"`.
  Express it as a union so that `appName` exists only in app mode.
- App mode behaves exactly as today.
- Test mode ignores an `overrides` block in every package, including the root, without an error.
  It does not throw when a package with i18n has no file for the locale.
  It still calls `loadI18n` for every package that has a file for the locale, so missing files on disk keep failing.
- Update the one call site in `codegenPlugin.ts` to pass `mode: "app"`.
- Extend `generateI18n.test.ts`: test mode with a package lacking the locale, and the app mode cases unchanged.
  The override handling of test mode is not covered by tests on purpose, since it may change.

## Out of scope

The virtual module itself, `shared.ts`, the plugin fixture.

## Done when

`pnpm build`, `pnpm check-types`, `pnpm exec oxlint packages/vite-plugin` and
`pnpm exec vitest run packages/vite-plugin` pass.
