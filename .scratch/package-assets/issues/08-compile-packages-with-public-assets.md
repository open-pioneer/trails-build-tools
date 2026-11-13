# Compile packages with public assets

Status: ready-for-agent
Issue: #60
Blocked by: 07

Spec: `.scratch/package-assets/spec.md`, sections "Published packages" and "Design > build-package".

The package compiler ignores `publicAssets` and rejects an import of `open-pioneer:assets`.
After this ticket a compiled package carries its public assets and the metadata that ticket 07 taught the plugin
to read.

## Scope

Only `packages/build-package`.

### Model

In `src/model/PackageModel.ts` (or a small module next to it), classify every `local` entry of
`input.packageConfig.publicAssets`:

- **Dependency entry**: the normalized `src` contains a `node_modules` segment. The package name is the one or two
  (scoped) segments after the last `node_modules`, the rest is `path`. Example:
  `node_modules/@scope/third-party-lib/dist/cdn` gives `@scope/third-party-lib` and `dist/cdn`.
- **Local entry**: everything else.

The compiler is the only place that restricts where `src` points. The build config validation and the Vite plugin
accept any relative path, so a source package may point outside itself during development.

Validation, reported as errors that stop the build (not through `ValidationReporter`, these are not style checks):

- a local entry whose resolved directory is not inside the package directory, for example `../shared/assets`.
  The message says that a published package may only use public assets from itself or from a dependency.
  Compare resolved paths with `isInDirectory`, as `virtualModules.ts` does, not the `src` string.
- any entry while `packageFormatTarget` lacks `public-assets`: "Public assets require package format target '1.2' or
  later."
- a directory that does not exist. For a dependency entry, check the path as written, relative to the package.
- a dependency that is in neither `dependencies` nor `peerDependencies` of the package's `package.json`
- a local `src` that equals or contains the output directory

Expose the result on `PackageModel` as two lists, so the copy step and the metadata step read the same data.

### Copy step

New `src/copyPublicAssets.ts`, called in `buildPackage.ts` after `copyAssets`, only if there are local entries.
Log "Copying public assets...". For each local entry call `copyPublicAssetDirectory(<package>/<src>,
<dist>/<src>)` from build-common. Dependency entries are not copied.

### Metadata

`generateMetadata` in `src/generatePackageJson.ts` writes `publicAssets`: local entries as `{ src, dest }`,
dependency entries as `{ package, path, dest }`. Omit the field when there are none.
`SimplePackageModel` needs the new model fields.

### Virtual module

`virtualModulesPlugin` in `src/rollup/virtualModules.ts`, case `assets`:

- check `supportsFeature(packageFormatTarget, "public-assets")`, same error text as the `deployment` case
- return `{ id: source, external: true }`, as the `deployment` case does, so the import stays unchanged
- the plugin finds the package from the importing file (ticket 04) or from the optimizer (ticket 07)

The output must contain no URL and no directory name of the public assets.
Check that `checkImports.ts` still skips the id.

## Tests

- Fixture `test-data/project-with-public-assets`: `public/` with a nested file and a dot file, a committed
  `node_modules/third-party-lib/cdn`, `third-party-lib` in `dependencies`, target 1.2, a module importing
  `open-pioneer:assets`.
- `copyPublicAssets.test.ts`: files in `dist/public`, no dot file, nothing from the dependency.
- `generatePackageJson.test.ts`: metadata with both kinds, inline snapshot.
- `buildJs.test.ts`: the emitted import is `open-pioneer:assets`, unchanged. Target 1.1 fails with the message.
- Model errors: missing directory, undeclared dependency, target too low, `src` outside the package.
- Every test file takes its directory from `tempDirForTest(import.meta.url)`.

## Done when

`pnpm build`, `pnpm check-types`, `pnpm exec oxlint packages/build-package` and
`pnpm exec vitest run packages/build-package` pass.
