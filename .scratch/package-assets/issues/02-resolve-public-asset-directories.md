# Resolve public asset directories during package analysis

Status: done
Issue: #60
Blocked by: 01

Spec: `.scratch/package-assets/spec.md`, section "Design > vite-plugin".

After ticket 01 a `PackageConfig` carries `publicAssets`, but the Vite plugin does nothing with it.
This ticket turns the entries into absolute directories, once per package, during the existing analysis.

## Scope

Only `packages/vite-plugin/src/metadata`.

- Add to `AnalyzedPackage` in `Metadata.ts`:

    ```ts
    /** Public asset directories, in the order of the build config or package metadata. */
    publicAssets: ResolvedPublicAssetDir[];

    export interface ResolvedPublicAssetDir {
        /** Absolute real path of the directory on disk. */
        directory: string;
        /** Normalized path below the package's public assets, `""` for the root. */
        dest: string;
    }
    ```

- Resolve in `loadPackageMetadata.ts`, for source and published packages alike.
    - `local`: `resolve(packageDir, src)`, then `realpath`.
      The result may lie outside the package directory and outside the source root. Do not check containment.
      A source package may point anywhere while it is used in an app. Only the package compiler restricts `src`.
      Add a fixture entry with `src: "../shared-assets"` and assert it resolves.
    - `package`: find the dependency with `findDepPkgJsonPath(packageName, <package.json of the declaring package>)`
      from `vitefu`, as `MetadataRepository.ts` does, then join `path`, then `realpath`.
      No such entries exist before ticket 07, but implement and unit-test the branch now if the code structure allows
      a direct test. Otherwise leave a `throw` for the `package` type and say so in the ticket comments.
- Errors are `ReportableError` and name the package, the `src` and the resolved path:
  directory does not exist, path is not a directory, dependency cannot be found.
- Cost: one `stat` and one `realpath` per entry. Do not read directory contents.
- The package's `build.config.mjs` and `package.json` are already tracked for cache invalidation. Add nothing.

## Tests

New fixture `packages/vite-plugin/test-data/codegen-public-assets/` with a source root `src`, one app
`src/apps/test-app` and one source package that declares:

- `{ src: "public", dest: "." }` with `public/root.txt`, `public/nested/file.txt`, `public/.hidden`
- `{ src: "./node_modules/third-party-lib/cdn", dest: "third-party-lib" }`, with `node_modules/third-party-lib`
  committed as a real directory (see "Fixtures emulate installed dependencies" in `AGENTS.md`)

Later tickets reuse this fixture, so keep it small and name files by what they test.

Test through `MetadataRepository.getAppMetadata` or the nearest existing test seam in `src/metadata`:
directories resolved in declaration order, missing directory reports an error.

## Done when

`pnpm build`, `pnpm check-types`, `pnpm exec oxlint packages/vite-plugin` and
`pnpm exec vitest run packages/vite-plugin` pass.

## Comments

`src/metadata/resolvePublicAssetDir.ts` resolves a single entry, so the `package` branch has direct unit tests in
`resolvePublicAssetDir.test.ts`, including the missing dependency error.
`MetadataRepository.test.ts` covers the whole fixture through `getAppMetadata`.
`AnalyzedPackage.publicAssets` keeps the order of the build config instead of sorting by `dest`.
Ticket 01 now accepts an absolute `src`, and `resolve(packageDir, src)` handles it without a special case.
