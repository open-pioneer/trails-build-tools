---
"@open-pioneer/build-support": minor
"@open-pioneer/build-common": minor
---

Add support for the new `publicAssets` option in `build.config.mjs`.
A Trails package can declare public asset directories, which will be deployed with together with the built app using their original file names and unmodified contents.

The new version `"1.2"` of the package metadata format includes support for public assets from published packages (and the module `open-pioneer:assets`).
