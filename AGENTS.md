# AI Agent Guide: trails-build-tools

This repository holds the build tooling of the **Open Pioneer Trails** framework, published to npm under
`@open-pioneer/*`.
Trails apps use the Vite plugin from here to run and bundle, and Trails packages use the package compiler from here to
produce a publishable `dist`.
The remaining packages are small helpers around pnpm and Changesets.

This file is the single source of truth for agents.
`CLAUDE.md` and `.github/copilot-instructions.md` only point here.

## Architecture

### Folder structure

```
packages/
  build-support/            # Public types for build.config.mjs (BuildConfig, defineBuildConfig). No runtime logic.
  build-common/             # Shared by the plugin and the compiler: loads/validates build.config.mjs into a PackageConfig,
                            # defines the published package metadata format (PackageMetadataV1) and RuntimeSupport
                            # (the open-pioneer:* virtual module ids and the code generated for them)
  vite-plugin/              # @open-pioneer/vite-plugin-pioneer: mpaPlugin (entry points, output names) + codegenPlugin
                            # (resolves and generates the open-pioneer:* modules); metadata/ walks an app's dependency graph
  build-package/            # Package compiler: JS (rollup + esbuild), .d.ts, CSS/SCSS, i18n, assets, package.json, aux files
  build-package-cli/        # `build-pioneer-package` command on top of build-package
  check-pnpm-duplicates/    # `check-pnpm-duplicates` command: finds duplicate packages via `pnpm list --json`
  create-license-report/    # `create-license-report` command: HTML license report from `pnpm licenses list`, checked
                            # against an allow list in license-config.yaml
  cli-logging/              # Logger interface plus console, memory and silent loggers, used by build-package and the CLIs
  pnpm-plugin-defaults/     # pnpm config dependency (single CommonJS pnpmfile.cjs) that sets our default pnpm options
  changesets-release-line/  # Changelog formatter for @changesets/cli that omits internal dependency bumps

integration-tests/
  build-package-cli-tests/  # Compiles real-world packages copied into test-data/ with the built CLI, compares with __snapshots/
  check-pnpm-duplicates-tests/  # Runs the built CLI against prepared lockfiles
  create-license-report-cli-tests/  # Installs a fixture project offline, runs the built CLI, compares the HTML with __snapshots__/

support/
  shared-configs/tsdown.ts  # defineLibraryConfig / defineCliConfig used by every package's tsdown.config.ts
  checkGenerated.js         # Fails when the build changed a package.json (see Toolchain quirks)
```

Each package keeps its source in `src/`, its tests next to the code as `*.test.ts`, its fixtures in `test-data/` and its
test output in `temp/`.

### How the pieces fit

`build.config.mjs` is the contract between a Trails package and the tooling.
`build-support` types it, `build-common` loads and validates it, and both the Vite plugin and the package compiler read
the resulting `PackageConfig`.

The Vite plugin serves an app from source.
`codegenPlugin` answers imports of `open-pioneer:app`, `open-pioneer:react-hooks`, `open-pioneer:source-info` and
`open-pioneer:deployment` with generated modules.
To do so, `MetadataRepository` starts at the app's `package.json`, visits every dependency, keeps the ones that carry a
`build.config.mjs` or published package metadata, and caches each result together with the files that produced it, so a
change to one `package.json`, `build.config.mjs` or i18n YAML invalidates exactly that entry and triggers a reload.
A Trails package that appears at two locations in one app is a build error.

The package compiler produces what the plugin later consumes from `node_modules`.
`buildPackage.ts` runs the steps in order: JavaScript, declarations, styles, i18n, assets, `package.json`, auxiliary
files, then `ValidationReporter.check()`, which turns collected warnings into a failure in strict mode.
The generated `package.json` carries the package metadata in the `PackageMetadataV1` format, and `packageFormatTarget`
picks which minor version of that format to emit.
`RuntimeSupport` in `build-common` generates the same module shapes for both the plugin and the compiler, so an app
behaves the same whether a package is linked from source or installed from npm.

Errors meant for the user of the tooling are `ReportableError` in the plugin and `Error` with a `cause` chain in the
compiler and the CLIs.
The CLIs print the chain, and the plugin reports anything else as an internal error.

### Technology stack

- **Language / Runtime**: TypeScript, Node.js ESM.
  The repository requires Node >= 24, but the published packages declare `node >= 20`, so the code they ship must run
  on Node 20.
- **Package manager / Monorepo**: pnpm workspaces with catalogs (`catalog:` for our dependencies, `catalog:tests` for
  the deliberately old Trails versions the integration tests compile against).
- **Package build**: tsdown (rolldown), configured once in `support/shared-configs/tsdown.ts`.
- **Bundlers used at runtime by our tools**: Vite 8 / rolldown (plugin), rollup + esbuild (compiler).
- **Testing**: Vitest, one root config without projects.
- **Linting / Formatting**: Oxlint (TS, import, promise, vitest rules, SPDX header), Oxfmt.
- **Release**: Changesets, published by the shared workflows from `open-pioneer/trails-repo-automation`.
- **DX**: Husky + lint-staged, Renovate.

## Development & build

### Verification commands

- **Build**: `pnpm build` (all packages, in dependency order) or `pnpm dev` (watch mode in every package).
  Type checks and tests both need a build first: packages expose the `.d.ts` files from their `dist`, and the
  integration tests run the built CLI.
- **Lint**: `pnpm exec oxlint packages/path/to/file-or-folder`
- **Auto-format**: `pnpm exec oxfmt packages/path/to/file-or-folder`
- **Typecheck**: `pnpm check-types`
- **Tests** (run from the repository root):
    - Single file: `pnpm exec vitest run packages/vite-plugin/src/codegenPlugin.test.ts`
    - Single test by name: `pnpm exec vitest run packages/build-package -t "transpiles a simple javascript project"`
    - Integration tests: `pnpm build && pnpm install`, then `pnpm exec vitest run integration-tests`
    - Update snapshots: add `-u`
- **Everything CI runs**: `pnpm ci:test` (clean, build, check-generated, check-types, lint, install, test).

### Toolchain quirks

- **The build rewrites `package.json`.**
  tsdown generates the `exports` field of each published package (`exports: true` in the shared config).
  `pnpm check-generated` fails when the build left a diff, so review the change and commit it.
- **`pnpm install` after `pnpm build`** links the freshly built CLI binaries into the integration test packages.
  Without it, the integration tests run stale code.
- **Fixtures emulate installed dependencies.**
  The `test-data/` directories contain committed `node_modules` folders and symlinks that stand in for a pnpm install.
  They are excluded from lint, format, type check and test discovery, and Renovate ignores them.
  On Windows, git must be allowed to create symlinks (see the README).
- **`temp/` is per package and per test file.**
  Tests write their output below `<package>/temp`.
  Every `build-package` test file takes its directory from `tempDirForTest(import.meta.url)`, because `tsc` picks up
  every file the surrounding `tsconfig.json` matches, so two test files must never share a directory.
- **`pnpm-plugin-defaults` builds to its package root**, as a single bundled CommonJS `pnpmfile.cjs`, because pnpm
  loads config dependencies by path and they cannot have dependencies of their own.
- **Workspace links use the `workspace:` protocol** (`linkWorkspacePackages: false`).
  Published packages depend on each other with `workspace:^`, the private `shared-configs` with `workspace:*`.
- **Dependency resolution prefers old versions.**
  `resolutionMode: lowest-direct` and a three day `minimumReleaseAge` are set in `pnpm-workspace.yaml`.
  Version bumps therefore happen through the catalog, usually by Renovate.
- **Debug output**: set `DEBUG="open-pioneer:*"` to see the `createDebugger` logs of the plugin and the compiler.

### Pre-commit hook

The Husky pre-commit hook runs on every commit in this order:

1. `pnpm install --frozen-lockfile --lockfile-only` checks the lockfile is current.
2. `lint-staged` formats and lints staged JS/TS, formats staged Markdown, JSON, CSS, YAML.
3. `pnpm run clean && pnpm run build`, then `pnpm run check-generated` and `pnpm install`.
4. `pnpm check-types`
5. `CI=1 pnpm exec vitest run --changed --passWithNoTests` runs the tests affected by the change; `CI=1` rejects
   `.only`.

Set `NO_VERIFY=1` to skip the hook.

### Changesets

Every change to a published package that a consumer can notice gets a changeset: `pnpm changeset`.
The summary is rendered into the package's `CHANGELOG.md`, so write it for the consumer.
Start a breaking change with `**Breaking:**`.
A release pull request is opened automatically from the pending changesets and publishes on merge.

## Code style

### Enforced by Oxlint / Oxfmt

- Double quotes, semicolons, no trailing commas.
- 4-space indentation, 2 for YAML.
- Print width 100.
- Imports are sorted, with no blank lines between groups.
- No non-null assertions and no `any` outside test files, so use type guards.
- Unused imports warn, and an unused variable or parameter needs a `_` prefix.
- At most 4 parameters per function; pass an options object above that.
- Every `*.ts`, `*.mts` and `*.js` file starts with this header, followed by a blank line:

    ```ts
    // SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
    // SPDX-License-Identifier: Apache-2.0
    ```

- An `oxlint-disable` directive that no longer suppresses anything is an error.

### Not enforced by tooling

- **Author files top to bottom, most important entity first.**
  The primary exports go to the top.
  Helpers, private functions, and supporting types follow in the order a reader first meets them.
  Reorder only when module evaluation order forces it.
- **Use `#` for private fields and methods**, never the `private` keyword.
- **Import Node built-ins with the `node:` prefix.**
- **Fixtures are directories, not strings.**
  A test that needs a project on disk gets a directory under `test-data/` with a speaking name such as
  `project-with-missing-i18n-files`.
  It reads inputs from there and writes outputs to `temp/`.
- **In Vitest, write top-level `it()` cases.**
  Use `describe()` sparingly, to group closely related cases.
- **Test cases first, helpers at the bottom.**
  A reader sees what is tested before how it is set up.
- **User-facing failures carry their cause.**
  Throw `new Error(message, { cause })` when wrapping, and `ReportableError` inside the Vite plugin for messages a
  Trails developer should read.

### Comments

- **Default to no comment.**
  Add one only when it makes the code easier for a human to understand.
- **Comment the why.**
  Intent, a non-obvious constraint, or a reason a reader cannot see from the code.
  Restating the code, explaining language mechanics, or an empty `@param` tag is worse than nothing.
- **Stay local and short.**
  Comment the code in front of you, one line where one suffices.
  Behavior in other files or functions is described there.
- **Describe the system as it is now.**
  No history, no former names, no commented-out code.
  Write the intent worth keeping as one sentence.
  When you change code, update or delete any comment it makes stale.
- **No section dividers.**
  A `// ---- helpers ----` banner repeats structure the names already carry.

**The one exception: published types.**
The interfaces in `build-support`, `PioneerPluginOptions` in the Vite plugin and `client.d.ts` are read in an editor
hover with no code next to them, so every member there keeps a doc comment with an `@example` where one helps.
The other comment rules still apply inside it.

## Writing

Everything you write is read by a human unless otherwise noted.
That covers chat replies, commit messages, pull request text, changeset summaries, Markdown documents, doc comments and
`//` comments.
Two terms are used below:

- **Rendered prose** is the Markdown under `docs/`, the READMEs, the skills under `.claude/skills/`, this guide,
  and the `/** */` doc comments that TypeDoc publishes.
- **Agent documents** are subagent prompts, `.scratch/<feature>/issues/*.md` and `.scratch/<feature>/map.md`, which agents write for agents.
  They can ignore style and layout rules.
  Everything else under `.scratch/`, including `spec.md`, is read by a human.

### Style

Simple, technical English.

- **Lead with the answer.**
  The outcome comes first, the reasoning after it, and only as much of it as the reader needs to act.
- **Write for a reader who did not watch you work.**
  They know the domain but not your tool calls.
  Say what you found and what you changed, not how you searched.
- **One idea per sentence, about 20 words.**
  Split a longer sentence at its second idea.
- **Plain punctuation.**
  Periods and commas.
  Write a second sentence instead of joining clauses with an em-dash, semicolon, or colon.
  An aside gets its own sentence instead of parentheses.
- **Established words only.**
  Name things with the words the code, the package READMEs, or ordinary technical English already use.
  Use the same word for the same thing throughout a text.
  Where no word exists, describe the thing in a short phrase.
- **Concrete over abstract.**
  Name the file, the function, the error, the number.
  "The test fails because `resolve()` returns null" beats "there appears to be an issue with the return value".
- **Active voice, present tense, named actor.**
  "The linter rejects this" rather than "this would be rejected".
  Plain verbs: "analyze", not "perform an analysis".
- **Match confidence to evidence.**
  State what you verified as fact.
  Say first, and plainly, what you could not verify.
  Never hedge a verified fact and never assert a guess.
- **Report, do not narrate.**
  Leave out commentary on your own process, plan, or reasoning: "I'll now", "Let me", "Interestingly".
- **Content only.**
  Start with the first fact and stop when the content stops.
  Drop openers, closers, praise, and summary sentences: "Great question", "Certainly", "In summary", "Let me know if".
  Drop transition words that carry no meaning: "Additionally", "Furthermore", "Moreover".
- **Everyday vocabulary.**
  Not: load-bearing, robust, seamless, comprehensive, leverage, delve, streamline, crucial, pivotal, elevate,
  "serves as".
- **Say what is.**
  State claims in the affirmative.
  No "not X, but Y" frame and no rhetorical questions.
- **Count what is there.**
  Two items are a pair, not a triplet padded for rhythm.

### Layout

How a human-facing text is arranged on the page.
Chat replies are the main case.

- **Prose by default.**
  Use a bulleted or numbered list only for parallel items: findings, steps, options, files to look at.
  One or two sentences per bullet, never a paragraph.
- **Bold the first few words** of a bullet or paragraph at most.
  Never a whole sentence, and never a bold label plus colon standing in for a sentence.
- **Headers only above about 500 words**, and then at most three.
- **Code, commands, and error text go in fenced code blocks.**
  In prose, name at most one file, function, or flag per sentence, and only when the reader has to go there.
- **Numbers go in a table or on their own line**, and only when they change what the reader does.
- **No emoji.**
- **Expand an uncommon acronym on first use.**
  Refer to a person or a message by who and what, never by a label you made up during the session.

### Formatting rendered prose

Oxfmt rewraps neither Markdown prose nor comment text, so the breaks you write survive a commit.

- **One sentence per line.**
  A long sentence may run over several lines, but two sentences never share one.
  Rewording one sentence then touches exactly one line, so a review shows what actually changed.
- **Keep a line within about 120 characters.**
  Sentence boundaries decide where a new line starts.
  The width only decides where a sentence breaks.
  Overshoot rather than split a URL, an inline code span, or a `{@link}` reference.
  Never fill a line by pulling up the start of the next sentence.
- **Leave code blocks, tables, and front matter alone.**
- **In a doc comment, this covers the description and the text of every tag** such as `@param` or `@example`.
  Each sentence gets its own `*` line.

Ordinary `//` comments are not rendered, so they are outside this subsection.

## Keeping this guide current

Treat this file and the documents under `docs/agents/` as living documents.
If, while working, you notice that one is outdated, inaccurate, or did not help you complete a task (wrong paths, stale
commands, a missing convention), fix the relevant passage and mention the update to the user.

## Agent skills

Configuration for the agent workflow skills.
Each file below is the contract for one part of the workflow; read it before acting on the topic it covers.

### Issue tracker

Issues and specs for agent work are files under `.scratch/` in this repository.
The GitHub issues are for people and stay untouched.
See [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).

### Triage labels

Triage state is a `Status:` line inside each issue file, using the five canonical role names plus `done`.
See [docs/agents/triage-labels.md](docs/agents/triage-labels.md).

### Domain docs

Single-context layout: one `CONTEXT.md` at the repository root and decision records in `docs/adr/`.
Read `CONTEXT.md` before touching the code; it defines the project's words and the synonyms to avoid.
See [docs/agents/domain.md](docs/agents/domain.md).
