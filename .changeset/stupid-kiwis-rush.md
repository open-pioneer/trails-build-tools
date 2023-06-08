---
"@open-pioneer/vite-plugin-pioneer": patch
---

Add another workaround that unfortunately currently requires pnpm's `shamefully-hoist` option.

[`shamefully-hoist`](https://pnpm.io/npmrc#shamefully-hoist) allows the application to 'see' all other installed node packages.
This is usually a bad practice but we currently require it for the virtual module that imports all open pioneer services.
For more details see the linked commit.
