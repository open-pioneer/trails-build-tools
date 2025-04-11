---
"@open-pioneer/build-package": patch
---

Hide rollup warnings when a module contains 'use client' directives.

NOTE: These directives may currently be dropped during the build.
This is not a problem in practice (at this time) because we only use client components anyway.
