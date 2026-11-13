# Add package format 1.2 and read public assets of published packages

Status: ready-for-agent
Issue: #60
Blocked by: 06

Spec: `.scratch/package-assets/spec.md`, section "Published packages".

So far only source packages have public assets.
This ticket defines how a published package declares them and makes the Vite plugin read that.
The compiler does not write the new field yet. That is ticket 08, so the tests here use hand-written fixtures.

## Scope

### build-support

`PackageFormatTarget` becomes `"1.0" | "1.1" | "1.2"`. Extend the doc comment of `packageFormatTarget` with one line
per version that says what it enables.

### build-common, `src/packageMetadata/v1.ts`

- Version history comment: "1.2.0: Packages may declare public assets and use the `open-pioneer:assets` module".
- `LATEST_VERSION = "1.2.0"`, `MINOR_VERSIONS` gets `"1.2"`, `LATEST_VERSION_FOR_TARGET["1.2"] = "1.2.0"`.
- `featuresSince["public-assets"] = "1.2"`, and the key type.
- New optional field on `PackageMetadata`:

    ```ts
    publicAssets?: Nullish<PublicAssetMetadata[]>;

    export type PublicAssetMetadata =
        | { src: string; dest: string }
        | { package: string; path: string; dest: string };
    ```

    `src` is relative to the published package directory. `path` is relative to the root of the package named by
    `package`. `dest` is already normalized, `""` for the root.
    Add it to `PACKAGE_METADATA_SCHEMA`. Keep the objects non-strict, see the note above the schema.
- `serializePackageMetadata`: throw if `publicAssets` is non-empty and the target does not support `public-assets`.
  Do not drop the field silently.
- `DEFAULT_PACKAGE_TARGET` stays `"1.0"`.

### build-common, `src/packageConfig/index.ts`

`createPackageConfigFromPackageMetadata` maps the field through the normalization function of ticket 01.
`{ src, dest }` becomes a `local` entry, `{ package, path, dest }` a `package` entry.
Do not check where `src` or `path` point. The package compiler checked the paths when it built the package
(ticket 08), and the plugin trusts its output. The mapping only converts the shape.
`path` may be `""` for the package root.

### vite-plugin

The `package` branch in `loadPackageMetadata.ts` from ticket 02 now gets real input. Finish and test it.
Resolution starts at the `package.json` of the declaring package, so a dependency that pnpm installed next to the
published package is found.

## Tests

- `v1.test.ts`: 1.2 round trip with both entry kinds, the serialization error for target 1.1, a 1.1 reader case is
  not needed (there is no old reader in this repository).
- `packageConfig/index.test.ts`: mapping of both kinds.
- vite-plugin: new fixture or an extension of `codegen-public-assets` with a published package, built like
  `test-data/codegen-packages-external`: the package lives outside the source root and is linked into the app's
  `node_modules`. Its `package.json` has `openPioneerFramework` with `packageFormatVersion: "1.2.0"`, a local entry
  and a `package` entry. The named dependency sits next to it, not inside it, to mirror pnpm.
  Its JavaScript imports `open-pioneer:assets?package=<its name>`.
  Assert with `runViteBuild`: the generated URL in the output, and the copied files of both entries.
- The dev server test of ticket 03 gets one request for a file of the published package.

## Done when

`pnpm build` leaves no unexpected `package.json` diff (`pnpm check-generated`), and `pnpm check-types`,
`pnpm exec oxlint packages` and `pnpm exec vitest run packages` pass.
