---
"@open-pioneer/build-package": minor
"@open-pioneer/build-package-cli": minor
---

Add support for the new `open-pioneer:deployment` import when building packages.

When compiling packages that make use of this new module, you must set the package format target (`--target` via CLI) to `1.1` or later.
Trails projects that consume such a package need an updated versions of the Open Pioneer Trails Vite plugin that supports the new target version.
