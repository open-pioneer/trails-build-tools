# Measure with a large set of public assets

Status: ready-for-human
Issue: #60
Blocked by: 09

Spec: `.scratch/package-assets/spec.md`, section "Open points".

The feature replaces `vite-plugin-static-copy` in real apps, where a build may copy tens of thousands of files and
several hundred megabytes.
Nobody has measured the new implementation on a set of that size, and Windows is the platform that hurt.
This ticket needs a human: it needs a real app with such a set, a Windows machine, and a judgment on the numbers.

## Setup

In a scratch branch of an app that copies a large directory with `vite-plugin-static-copy` today:

1. Use the built packages of this branch for `@open-pioneer/vite-plugin-pioneer` and `@open-pioneer/build-support`,
   for example through a pnpm override to the local `dist` directories.
2. Declare the copied directories as `publicAssets` in the `build.config.mjs` of the package that needs them.
3. Derive the URLs in that package from `getPublicAssetUrl(...)`.
4. Remove the static copy plugin from `vite.config.ts`, and any URL overrides from the test setup.

## Measure

On Linux and on Windows, each compared with the current setup:

| Measurement | How |
|---|---|
| Dev server start | time until "ready" |
| First page render | browser network panel, cold cache |
| Build, copy phase | total build time with and without the public assets |
| Browser tests | tests that need the public assets, including ones disabled today for speed |

Also check by hand:

- a classic worker that loads its chunks with `importScripts()` starts
- a build where the page and the app bundle are in different directories
- a deployment below a sub-path

## Decide

- If the build copy is too slow, replace `fs.promises.cp` in `copyPublicAssetDirectory` with a recursive
  `readdir` plus `copyFile` loop with bounded concurrency, and measure again.
  Record both numbers under `## Comments`.
- Record anything the feature cannot do for the app as a new ticket in this directory.
  Known candidates: ignore patterns for unused files, cache headers for unversioned URLs.
