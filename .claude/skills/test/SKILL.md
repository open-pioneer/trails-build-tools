---
name: test
description: Write, run and fix the tests of this repository. Use when adding a test case, building a test-data fixture, updating a snapshot, or investigating a failing test.
---

# Tests

## Pick the level

- **Unit test** for a function that takes values and returns values, next to the source as `<name>.test.ts`.
  `versionUtils.test.ts` and `utils/entryPoints.test.ts` are the examples.
- **Fixture test** for code that reads a package from disk.
  It runs one compiler step or a Vite build against a directory under `test-data/` and writes its output to `temp/`.
  This is the normal case in `build-package` and `vite-plugin`.
- **Integration test** for what a user of a CLI sees.
  It lives under `integration-tests/`, runs the built binary, and compares every emitted file with `__snapshots/`.
  Add one only when the CLI itself changes, because its loop needs a full build.

Pick the cheapest level that can fail for the reason you care about.

## Names

Name an `it()` case after the behaviour, as a plain verb phrase: `"bundles local css files"`,
`"throws if i18n files are missing"`.
A minority of older cases start with "should", so leave those names as they are instead of renaming them.

## Fixture tests

A fixture test runs the real step against a real directory.
The tests of this repository use no module mocks, no spies and no fake timers, and a new test does not need them.

A test imports the helpers of its own package.

- `build-package`: `./testing/paths` for `TEST_DATA_DIR` and `tempDirForTest`, `./testing/io` for `cleanDir` and
  `readText`, `./testing/helpers` for `expectError`, `./utils/Logger` for `createMemoryLogger`.
- `vite-plugin`: `./utils/testUtils` for `TEST_DATA_DIR`, `TEMP_DATA_DIR` and `runViteBuild`.
- `build-common`: `./test-utils/paths` for `TEST_DATA_DIR` and `TEMP_DATA_DIR`.
- `check-pnpm-duplicates`: `./testing/paths` for `setupPnpmWorkspace`, which copies a lockfile fixture into `temp/`
  and builds a workspace around it.

A `build-package` test resolves both directories, clears the output, runs the step, and reads the result back:

```ts
const TEMP_DATA_DIR = tempDirForTest(import.meta.url);

it("bundles local css files", async () => {
    const packageDirectory = resolve(TEST_DATA_DIR, "simple-css-project");
    const outputDirectory = resolve(TEMP_DATA_DIR, "simple-css-project");
    await cleanDir(outputDirectory);

    await buildCss({ ...testDefaults(), packageDirectory, outputDirectory, cssEntryPoint });

    expect(readText(resolve(outputDirectory, "styles.css"))).toMatchInlineSnapshot();
});
```

A test of the whole compiler builds its options with `resolveOptions`.
Pass `strict: false` and turn the `validation` switches off, so a minimal fixture does not fail on a missing README or
LICENSE.

`runViteBuild` builds an app with the plugin and throws when Vite logs any warning, so a fixture has to build cleanly.
Assert against the emitted bundle with `assert.include` on the text of `<outDir>/<app>.js`.

## Fixtures

A fixture is a real package directory with a `package.json`, a `build.config.mjs` and sources.

Installed dependencies are emulated by a `node_modules` directory inside the fixture.
It holds either committed package directories or symlinks to sibling fixtures, so the resolver finds a Trails package
where the test expects one.

No linter, formatter or type check reads `test-data/`, so the test run is the only check on a fixture.

## Assertions

- Generated file contents: `readText` with `toMatchInlineSnapshot`.
- An async failure a user should read: `await expect(...).rejects.toThrow(/I18n file does not exist/)`.
- A synchronous validation error: `toThrowErrorMatchingInlineSnapshot`.
- An error whose message or `cause` chain you want to inspect: `const error = await expectError(() => step(...))`.
- Warnings: pass a `createMemoryLogger()` and assert on `logger.messages`, down to
  `logger.messages[0]!.args[0]!` for the text.
  A step that must stay quiet asserts `expect(logger.messages).toEqual([])`.
  `toMatchInlineSnapshot` works on the whole array as well, and on any other serialized object.

## Integration tests

Run `pnpm build && pnpm install` before `pnpm exec vitest run integration-tests`, otherwise the tests run the CLI of
the previous build.

`runCli` copies the fixture from `test-data/<name>` to `temp/<name>`, runs the built CLI there, and returns the
`dist` directory together with stdout, with the absolute path replaced by `<PATH>`.
The test then snapshots the sorted file list inline and compares each file with `toMatchFileSnapshot` against
`__snapshots/<name>/<path with slashes replaced by underscores>`.

Review a snapshot update before committing it.
An unexpected new or missing file in the inline list is the compiler changing what it emits, not a test that drifted.
