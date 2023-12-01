---
"@open-pioneer/vite-plugin-pioneer": major
---

**Breaking Change:** A trails package's `devDependencies` are no longer included in the build (fixes #43).
For normal dependencies, service classes are automatically picked up and compiled into the application.

This behavior is surprising for `devDependencies`: license scanners and cve scanner sometimes chose to exclude
`devDependencies`; which would have been invalid prior to this change (as the code was compiled in anyway).

If your package depends on another trails package at runtime, configure an entry in `peerDependencies` instead.
