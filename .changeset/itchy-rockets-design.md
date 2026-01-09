---
"@open-pioneer/vite-plugin-pioneer": minor
---

Add service modules of trails packages from `node_modules` to the modules optimized by vite's deps optimizer.

This can reduce the number of events like this:

```
5:14:21 PM [vite] (client) ✨ new dependencies optimized: <...>
5:14:21 PM [vite] (client) ✨ optimized dependencies changed. reloading
```
