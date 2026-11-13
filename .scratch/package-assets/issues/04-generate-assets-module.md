# Generate the `open-pioneer:assets` module

Status: done
Issue: #60
Blocked by: 03

Spec: `.scratch/package-assets/spec.md`, sections "URLs" and "Design".

Today `RuntimeSupport.parseVirtualModule("open-pioneer:assets")` throws `Unsupported module id`.
This ticket makes the import work for source packages in the dev server and in an app build.
The build output does not contain the files yet. That is ticket 05.

## Scope

### build-common, `src/runtimeSupport/index.ts`

- `parseVirtualModule` returns `{ type: "assets" }` for `open-pioneer:assets`, like `react-hooks`.
  The public id takes no query, so `open-pioneer:assets?package=<name>` throws `Unsupported module id`.

### vite-plugin

- `generatePublicAssetsModule(packageDir: string): string` in `src/codegen/generatePublicAssetsModule.ts` returns the
  code below. The plugin is its only user, so it does not live in build-common.

    ```js
    import { baseUrl } from "open-pioneer:deployment";
    export const publicAssetsUrl = new URL("<packageDir>", baseUrl).href;
    export function getPublicAssetUrl(localAssetPath) {
        return new URL(localAssetPath, publicAssetsUrl).href;
    }
    ```

    Embed strings with `JSON.stringify`. `packageDir` is relative to the base URL and ends with a slash.

- `resolveId` in `codegenPlugin.ts`: find the importing package with `getPackageDirectoryFromImporter`, as the
  `react-hooks` branch does. An importer outside any package is a `ReportableError`.
  Return the internal id `<packageDirectory>/@@open-pioneer-assets`, type `package-assets` in `codegen/shared.ts`.
- `load`: read the package name from the resolved `package.json`, as for `source-info`.
  Return ``generatePublicAssetsModule(`${directory}/${packageNameToSlug(name)}/`)`` with `@package-assets` in dev and
  `packages` in a build. `packageNameToSlug` is in `src/publicAssets/packageSlug.ts`.
  Export `packages` as a constant from `src/publicAssets/`. Ticket 05 needs it.
- The package does not have to be registered. The module only computes a URL.

### build-package

`virtualModulesPlugin` in `src/rollup/virtualModules.ts` now meets the new type in its `switch`.
Keep the `default` error for it. Ticket 08 implements it.

## Tests

- `runtimeSupport/index.test.ts`: parsing of `open-pioneer:assets`, and a query on it throws.
- `generatePublicAssetsModule.test.ts`: generated code as inline snapshot, and the error for a missing trailing slash.
- `codegenPlugin.test.ts`, fixture `codegen-public-assets`: add a module in the source package that imports
  `open-pioneer:assets` and logs both exports. With `runViteBuild` and `findModuleContaining`, assert the output
  contains `packages/<packageSlug>/` and an import of the deployment module's `baseUrl`.
- Dev: extend the server test of ticket 03. Request the transformed module through the dev server and assert it
  contains `@package-assets/<packageSlug>/`.
- A second source package with a scoped name, to cover the slug `scope~name` in the URL.

## Done when

`pnpm build`, `pnpm check-types`, `pnpm exec oxlint packages` and
`pnpm exec vitest run packages/build-common packages/vite-plugin packages/build-package` pass.
