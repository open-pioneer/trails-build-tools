---
"@open-pioneer/vite-plugin-pioneer": patch
---

Fix virtual modules such as `open-pioneer:source-info` failing on the second Vitest run when `fsModuleCache` is enabled (default since Vitest 5.0.4).
The plugin should now resolve the root-relative module ids requested by the warm cache correctly.
