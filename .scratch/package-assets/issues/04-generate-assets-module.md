# Generate the `open-pioneer:assets` module

Status: ready-for-agent
Issue: #60
Blocked by: 03

Spec: `.scratch/package-assets/spec.md`, sections "URLs" and "Design".

Today `RuntimeSupport.parseVirtualModule("open-pioneer:assets")` throws `Unsupported module id`.
This ticket makes the import work for source packages in the dev server and in an app build.
The build output does not contain the files yet. That is ticket 05.

## Scope

### build-common, `src/runtimeSupport/index.ts`

- `parseVirtualModule` returns `{ type: "assets", packageName?: string }` for `open-pioneer:assets` and
  `open-pioneer:assets?package=<name>`. Parse the query the way `parseTestSupportQuery` does. Unknown query keys and
  an empty name throw. Update the doc comment that says only `test-support` accepts a query.
- `generatePublicAssetsModule(packageName: string, directory: string): string` returns:

    ```js
    import { baseUrl } from "open-pioneer:deployment";
    export const publicAssetsUrl = new URL("<directory>/<packageName>/", baseUrl).href;
    export function getPublicAssetUrl(localAssetPath) {
        return new URL(localAssetPath, publicAssetsUrl).href;
    }
    ```

    Embed strings with `JSON.stringify`. `directory` has no leading and no trailing slash.
- Export a helper that builds the id `open-pioneer:assets?package=<name>` from a package name. Ticket 08 uses it.

### vite-plugin

- `resolveId` in `codegenPlugin.ts`:
    - plain `open-pioneer:assets`: find the importing package with `getPackageDirectoryFromImporter`, read its name,
      as the `react-hooks` branch does. An importer outside any package is a `ReportableError`.
    - `open-pioneer:assets?package=<name>`: use the name, no importer needed.
    - Both return the global id `\0open-pioneer:assets?package=<name>`. Add the encoding and its parser to
      `codegen/shared.ts` next to the `deployment` id, and extend the header comment there.
- `load`: `generatePublicAssetsModule(name, directory)` with `@package-assets` in dev and `packages` in a build.
  Export `packages` as a constant from `src/publicAssets/`. Ticket 05 needs it.
- The package named in the id does not have to be registered. The module only computes a URL.
- Check that `VIRTUAL_ID_FILTER` matches all three id forms.

### build-package

`virtualModulesPlugin` in `src/rollup/virtualModules.ts` now meets the new type in its `switch`.
Keep the `default` error for it. Ticket 08 implements it.

## Tests

- `runtimeSupport/index.test.ts`: parsing of both forms, bad queries, generated code as inline snapshot.
- `codegenPlugin.test.ts`, fixture `codegen-public-assets`: add a module in the source package that imports
  `open-pioneer:assets` and logs both exports. With `runViteBuild` and `findModuleContaining`, assert the output
  contains `packages/<packageName>/` and an import of the deployment module's `baseUrl`.
- Dev: extend the server test of ticket 03. Request the transformed module through the dev server and assert it
  contains `@package-assets/<packageName>/`.
- A second source package with a scoped name, to cover `@scope/name` in the URL.

## Done when

`pnpm build`, `pnpm check-types`, `pnpm exec oxlint packages` and
`pnpm exec vitest run packages/build-common packages/vite-plugin packages/build-package` pass.
