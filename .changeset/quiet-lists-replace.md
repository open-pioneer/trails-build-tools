---
"@open-pioneer/check-pnpm-duplicates": minor
---

**Breaking:** the tool now requires pnpm 11 or later and aborts with an error for older versions.

The implementation is now based on `pnpm list` to read the packages in the lockfile instead of parsing it with the `@pnpm/*` packages.
This removes all `@pnpm/*` dependencies from this package.
