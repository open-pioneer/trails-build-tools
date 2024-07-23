---
"@open-pioneer/vite-plugin-pioneer": patch
---

Fix a problem that may produce dev server errors on newer versions of vite:

```
11:11:21 AM [vite] Internal server error: Failed to resolve services entry point for package $DIR/src/samples/showcase/showcase-app

Caused by: Cannot read properties of undefined (reading 'resolveId')
```
