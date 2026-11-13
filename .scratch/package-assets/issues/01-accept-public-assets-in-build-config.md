# Accept `publicAssets` in the build config and normalize it into the package config

Status: ready-for-agent
Issue: #60

Spec: `.scratch/package-assets/spec.md`, sections "`src` and `dest`" and "Design > build-common".

Today `BUILD_CONFIG_SCHEMA` in `packages/build-common/src/buildConfig/verifyBuildConfig.ts` is a `z.strictObject`
without `publicAssets`, so a build config that uses the option fails with "Unrecognized key(s)".
The types already exist in `packages/build-support/src/index.ts` (`BuildConfig.publicAssets`, `PublicAssetDir`).

## Scope

Only `packages/build-common`. No plugin, no compiler, no package metadata.

- Add `publicAssets` to `BUILD_CONFIG_SCHEMA`: a string, or an array of strict objects `{ src: string, dest: string }`.
- Add `publicAssets: PublicAssetConfig[]` to `PackageConfig` in `src/packageConfig/index.ts`.

    ```ts
    export type PublicAssetConfig = LocalPublicAssetConfig | PackagePublicAssetConfig;
    export interface LocalPublicAssetConfig { type: "local"; src: string; dest: string }
    export interface PackagePublicAssetConfig { type: "package"; packageName: string; path: string; dest: string }
    ```

    Define both types now. Only `local` is produced in this ticket. `package` entries arrive with ticket 07.
- Write one normalization function and call it from `createPackageConfigFromBuildConfig`.
  `createPackageConfigFromPackageMetadata` returns an empty list for now.
- Normalization rules:
    - A string `s` becomes `[{ src: s, dest: "." }]`.
    - `src` and `dest` use forward slashes. A leading `./` and a trailing `/` are removed.
    - `dest` of `"."` or `""` becomes `""`.
    - Errors: absolute `src` or `dest`, a `..` segment in `dest`, an empty `src` or a `src` of `"."`,
      two entries with the same normalized `dest`.
    - A `..` segment in `src` is allowed. A source package may point outside its own directory while it is used
      in an app. Do not check here whether `src` stays inside the package. Only the package compiler does that, in
      ticket 08. Add a test that `../shared/assets` passes and keeps its `..` after normalization.
    - A `src` through `node_modules` is allowed and stays `local`.
- Error messages name the offending value. They surface through the existing wrapper in `loadBuildConfig.ts`.

## Tests

- `verifyBuildConfig.test.ts`: string form, array form, unknown key inside an entry is rejected.
- `packageConfig/index.test.ts`: the mapping test gets `publicAssets`, plus cases for the shorthand, `"."`,
  duplicate `dest`, nested `dest` (allowed), absolute path, `..` in `dest` (error), `..` in `src` (allowed).
- Follow the existing style: top-level `it()`, inline snapshots for error messages.

## Done when

`pnpm build`, `pnpm check-types`, `pnpm exec oxlint packages/build-common` and
`pnpm exec vitest run packages/build-common` pass.
Other packages that construct a `PackageConfig` literal compile again (add `publicAssets: []` where needed).
