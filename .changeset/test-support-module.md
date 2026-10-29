---
"@open-pioneer/vite-plugin-pioneer": minor
---

Add the virtual module `open-pioneer:test-support` for tests of Trails packages.

The module exports `messages`, the i18n messages of the importing package and of all its dependencies.
The record can be passed to the `messages` property of `PackageContextProvider` from `@open-pioneer/test-utils/react`.
It also exports `messageLocale`, the locale of these messages.
Both properties can be helpful when implementing browser tests for React components based on Trails.

Messages are returned in the first locale of the package's `i18n` array in `build.config.mjs` by default.
A different locale can be requested with a query, for example `open-pioneer:test-support?locale=de`.

The module can only be imported from tests.
`vite dev` and `vite build` fail with an error when they encounter the import.
