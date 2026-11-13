# Public assets for Trails packages

Issue: #60

## Problem

A Trails package cannot ship files that must be reachable under a stable URL.
Third party libraries often need exactly that for their workers, fonts and translation files.
Apps work around it with `vite-plugin-static-copy` in their own `vite.config.ts`.

This does not scale to large sets of files, tens of thousands in a real project.
The plugin globs every file when the dev server starts, watches all of them with chokidar, and copies them with one
`fs.cp` call per file.
On Windows this is slow enough that projects disable the plugin in browser tests and override the asset URLs by
hand.
Every app that uses such a package has to repeat the configuration.

## Solution

A Trails package declares its public asset directories in `build.config.mjs`:

```js
export default defineBuildConfig({
    publicAssets: [
        { src: "public", dest: "." },
        { src: "./node_modules/third-party-lib/cdn", dest: "third-party-lib" }
    ]
});
```

Code of that package reads the URL from a virtual module:

```ts
import { publicAssetsUrl, getPublicAssetUrl } from "open-pioneer:assets";

thirdPartyLib.setAssetPath(getPublicAssetUrl("third-party-lib/"));
```

The Vite plugin serves the files in the dev server and copies them into the app build.
The package compiler carries the declaration into the published package.
The app needs no configuration.

The types of both APIs are committed in `packages/build-support/src/index.ts` and `packages/vite-plugin/client.d.ts`.

## Behavior

### Which files are public assets

- Every Trails package in the dependency graph of an app that declares `publicAssets` takes part.
  It does not matter whether any code imports `open-pioneer:assets`.
- A public asset directory contributes all files below `src`, recursively.
- A file or directory whose name starts with `.` is never served and never copied.
  The rule applies to the path below `src` only.
- Symbolic links are followed.
- There are no ignore patterns in this version.

### `src` and `dest`

- `publicAssets: "public"` is short for `[{ src: "public", dest: "." }]`.
- `src` is a relative path.
  An empty path or the package directory itself is an error.
- In an app, a source package may point `src` anywhere, also outside the package with `..`.
  The Vite plugin serves and copies whatever directory the path resolves to.
  This is a convenience for development.
- Only the package compiler restricts `src`.
  When a package is built for publishing, `src` must either stay inside the package, or run through
  `node_modules/<dep>/<rest>` and name files of a declared dependency.
  Every other path is an error there.
- The Vite plugin does not repeat these checks for a published package.
  It trusts the package metadata that the compiler wrote.
- `dest` is a relative path without `..`.
  `"."` and `""` both mean the root of the package's public assets.
- Entries keep the order of the build config.
- A `dest` may lie below another one or repeat it.
  When two entries provide the same file, the entry declared first wins.
  The dev server looks a file up from the first entry to the last.
  The build copies the entries in reverse declaration order, so an earlier entry overwrites a later one.
- A `src` directory that does not exist is an error.

### URLs

- `open-pioneer:assets` exports `publicAssetsUrl`, which ends with `/`, and `getPublicAssetUrl(localAssetPath)`.
  Both are absolute URLs derived from `baseUrl` of `open-pioneer:deployment`.
- In the dev server the public assets of a package are at `<base>@package-assets/<packageSlug>/`.
- In the build output they are at `packages/<packageSlug>/` below the output root.
- The package slug is the package name as one path segment.
  A scoped name loses its `@` and its `/` becomes `~`, so `@scope/name` becomes `scope~name`.
  An unscoped name stays as it is.
  npm forbids `~` in package names, so the encoding is reversible.
  The plugin reverses it to find the package of a request.
- The URLs carry no version and no hash.
- The location is an implementation detail.
  A later version may let an app developer change it per package.
  Nothing outside the generated module may therefore know the location, in particular no published package.

### Dev server

- The server does not scan and does not watch public asset directories.
  It reads a file when a request for it arrives.
- One middleware handles all requests below the prefix.
  It decodes the package name from the slug in the URL and looks up the package's public asset directories.
- A request below the prefix that matches no file gets status 404.
  It never reaches Vite's HTML fallback.
- Responses carry a content type, an ETag and `Cache-Control: no-cache`, and they support `If-None-Match` and `Range`.
- Files are served as they are on disk.
  Vite does not transform them, which classic workers need for `importScripts()`.
- The same holds in a Vitest browser run.
  There the root package is the package that imports `open-pioneer:assets`.

### App build

- The plugin copies the public assets of all packages of all apps in the build, once, after the bundle is written.
- The copy is asynchronous.
- It runs for the client environment only and not when `build.write` is `false`.

### Published packages

- Public assets require `packageFormatTarget: "1.2"`.
  Declaring `publicAssets` or importing `open-pioneer:assets` with a lower target is an error.
- The compiler copies each directory inside the package to the same relative path in `dist`.
- The compiler does not copy files of a dependency.
  It checks that the dependency is listed in `dependencies` or `peerDependencies`.
- The package metadata lists both kinds:

    ```json
    "publicAssets": [
        { "src": "public", "dest": "" },
        { "package": "third-party-lib", "path": "cdn", "dest": "third-party-lib" }
    ]
    ```

- The plugin resolves a `package` entry from the location of the published package, the way Node resolves a bare
  import.
  This is needed because pnpm installs the dependencies of a published package next to it and not inside it.
- The compiler keeps an import of `open-pioneer:assets` unchanged and external.
  The plugin resolves it from the importing file, as for a source package.
- Vite's dependency optimizer bundles published packages together, so in the dev server the importing file no longer
  tells the package.
  The rolldown plugin that the Vite plugin adds to the optimizer therefore resolves the import while the importer is
  still known.
  It replaces the import with the internal id `\0open-pioneer:package-assets:<packageDirectory>`.
  The magic file name of a source package does not work here, because for a package outside the root it is an
  absolute path that `resolveId` cannot tell from a root-relative URL.
- A plugin older than this feature rejects a 1.2 package with its existing error "Try updating
  @open-pioneer/vite-plugin-pioneer".

## Design

### build-common

- `BUILD_CONFIG_SCHEMA` accepts `publicAssets`.
- `PackageConfig.publicAssets` is a normalized list of two entry types:
  `{ type: "local", src, dest }` and `{ type: "package", packageName, path, dest }`.
  One function normalizes and validates entries for both `createPackageConfigFromBuildConfig` and
  `createPackageConfigFromPackageMetadata`.
  A build config only produces local entries.
- `PackageMetadataV1` gets version 1.2.0 with the optional `publicAssets` field and the feature `public-assets`.
- `RuntimeSupport.parseVirtualModule` accepts `open-pioneer:assets` without a query, like `open-pioneer:react-hooks`.

### vite-plugin

The code lives in `src/publicAssets/` and `codegenPlugin.ts` drives it, like `DeploymentModule` today.

- `loadPackageMetadata.ts` resolves each entry to an absolute real directory and stores the list on `AnalyzedPackage`.
  A `package` entry is resolved with `findDepPkgJsonPath` from `vitefu`.
  Errors are `ReportableError`.
- `MetadataRepository.getLoadedPackage(name)` returns a Trails package the repository has loaded, which includes
  every package of an analyzed dependency graph.
  The middleware looks the package up there on each request, so no separate registry exists.
- The dev middleware is registered directly in `configureServer`, so it runs before Vite's own middlewares.
  It creates one `sirv` handler per directory on first use and keeps it.
- An import of the module resolves to the internal id `<packageDirectory>/@@open-pioneer-assets`, a magic file name
  like the ids of `open-pioneer:react-hooks` and the i18n modules.
  Loading the module reads the package name from the `package.json` in that directory.
  Only the plugin knows the internal id, and `RuntimeSupport` rejects a query on `open-pioneer:assets`.
- The plugin generates the module code itself, because nothing else needs it.
- The build copy runs in `writeBundle`.
- `copyDirectory(src, dest)` copies one directory with `fs.promises.cp`, `recursive`, `dereference` and a filter for
  dot names.

### build-package

- `PackageModel` classifies each entry as local or dependency and validates it.
- `copyPublicAssets` is a new step after `copyAssets`.
- `generatePackageJson` writes the metadata field.
- `virtualModulesPlugin` keeps the import unchanged and external.

## Out of scope

- Ignore patterns per directory.
- A preview server hook that answers a missing public asset with 404.
- A file name case check on Windows.
- A setting for app developers to change the public assets path of a package.
- Migrating existing apps away from `vite-plugin-static-copy`.

## Open points

- It is not verified that Vitest's browser server runs a middleware that a project plugin registers in
  `configureServer`.
  Ticket 06 checks this first.
- No measurement of the copy speed exists.
  Ticket 10 measures `fs.promises.cp` on a large set of files and replaces it with a copy loop with bounded concurrency
  if it is too slow.

## Tickets

The tickets in `issues/` are a chain.
Each one builds on its predecessor and ends with passing tests.
