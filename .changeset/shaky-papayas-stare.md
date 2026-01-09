---
"@open-pioneer/build-package": minor
"@open-pioneer/build-common": minor
"@open-pioneer/vite-plugin-pioneer": minor
---

Implement sourceId helper which provides an easy way to obtain an id for the current source file:

```ts
import { sourceId } from "open-pioneer:source-info";

// If imported from foo/bar/baz.ts in package my-package: my-package/foo/bar/baz
console.log(sourceId);
```
