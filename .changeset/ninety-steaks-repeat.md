---
"@open-pioneer/build-package-cli": minor
"@open-pioneer/build-package": minor
---

Implement additional validations when importing modules from other packages.

-   When importing modules from normal node packages, `build-package` will now check that the imported module actually exists.
-   When importing modules from another trails package in the same repository, `build-package` now verifies that the imported module is an actual entry point of that package (declared in the `build.config.mjs`).

These validations are designed to errors where a package would run locally (in Vite's development mode)
but end up broken when published (see also https://github.com/open-pioneer/trails-core-packages/issues/42).
