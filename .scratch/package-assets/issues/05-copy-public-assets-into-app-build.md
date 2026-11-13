# Copy public assets into the app build

Status: ready-for-agent
Issue: #60
Blocked by: 04

Spec: `.scratch/package-assets/spec.md`, section "App build".

After ticket 04 a built app computes URLs below `packages/<packageName>/`, but the files are missing from the output.

## Scope

### build-common

New exported function, in its own file under `src/utils/` or a new `src/publicAssets/` folder:

```ts
/** Copies all files below `src` into `dest`, skipping files and directories whose name starts with `.`. */
export async function copyPublicAssetDirectory(src: string, dest: string): Promise<void>
```

- `fs.promises.cp(src, dest, { recursive: true, dereference: true, force: true, filter })`.
- The filter decides on the path relative to `src`. The absolute path of a pnpm dependency contains `.pnpm` and must
  not be rejected. The root itself always passes.
- No sync variant. No glob. No per-file call from our code.
- Must run on Node 20.

### vite-plugin

- `writeBundle` hook in `codegenPlugin.ts`, delegating to a function in `src/publicAssets/`.
- Skip unless `this.environment.name === "client"`.
- Target root: `resolve(this.environment.config.build.outDir, "packages")`.
- For every registered package, in a stable order: copy its directories from the shortest `dest` to the longest into
  `<target root>/<packageName>/<dest>`, one after another, so a deeper `dest` overwrites.
  The registry stores the opposite order. Reverse a copy, do not mutate.
- `writeBundle` runs once per output. Copy only once per build. Reset the guard in `buildStart`.
- Before copying, check the bundle passed to `writeBundle`: a file name below `packages/<packageName>/` of a package
  with public assets is a `ReportableError` that names the file and the package.
- Log one line per build through the plugin's existing debug or logger facility with the number of directories.
  Do not count files.
- Nothing to do for `build.write === false`: Vite does not call `writeBundle` then.

## Tests

- build-common: copy a small tree from `test-data/` into `temp/`. Dot file and dot directory are skipped, nested
  files arrive, a symlinked file is copied as a file, a `src` whose absolute path contains a dot directory works.
- vite-plugin, fixture `codegen-public-assets` with `runViteBuild`: assert the sorted list of files below
  `packages/` in the output directory. It covers both packages, the nested `dest`, the overwrite order for a file
  that exists in both directories, and the absence of `.hidden`.
- A build of an app whose graph has no public assets creates no `packages` directory.

## Done when

`pnpm build`, `pnpm check-types`, `pnpm exec oxlint packages` and
`pnpm exec vitest run packages/build-common packages/vite-plugin` pass.
