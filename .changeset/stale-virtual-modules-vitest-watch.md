---
"@open-pioneer/vite-plugin-pioneer": patch
---

Exclude virtual modules from vitest's file system cache.

This regenerates `open-pioneer:*` modules on vitest watch reruns.
With vitest's `fsModuleCache` (enabled by default since vitest 5), a change to an i18n file or a `build.config.mjs` triggered a rerun that still used the previously generated (and thus stale) `open-pioneer:test-support` and app modules.

In addition, the plugin now listens to vitest's file watcher, because vitest does not forward file changes to the vite server of a project with its own config, such as a browser project.
`vitest` (`^5.0.0`) is now an optional peer dependency of the plugin.
