---
"@open-pioneer/vite-plugin-pioneer": patch
---

Improve error message when two versions of the same pioneer package are encountered.
Only a single version per pioneer package per app is supported: all packages must share the same version and location on disk.

The vite overlay in the browser now shows a comprehensible error message such as this:

```text
[plugin:pioneer:codegen] Encountered the package '@open-pioneer/runtime' at two different locations.
Pioneer packages cannot be used more than once in the same application.
All packages must use a common version of '@open-pioneer/runtime'.

1. @open-pioneer/runtime@1.0.0 at $HOME/projects/pioneer/starter/node_modules/.pnpm/@open-pioneer+runtime@1.0.0_@formatjs+intl@2.9.0_@open-pioneer+chakra-integration@1.0.0_@open_4cza3noe47gq2v2rsqn2cypo4q/node_modules/@open-pioneer/runtime

2. @open-pioneer/runtime@0.1.5 at $HOME/projects/pioneer/starter/node_modules/.pnpm/@open-pioneer+runtime@0.1.5_@formatjs+intl@2.9.0_@open-pioneer+chakra-integration@0.1.4_@open_m544g2vyxvedm3ipuqpqhltgfy/node_modules/@open-pioneer/runtime
```
