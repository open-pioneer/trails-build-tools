---
"@open-pioneer/build-package": patch
---

The compiler fails with an error when a package imports `open-pioneer:test-support`.
The module is reserved for tests and cannot be part of a published package.
