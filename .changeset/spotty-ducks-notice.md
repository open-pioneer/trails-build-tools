---
"@open-pioneer/build-package": minor
---

Implement automatic rewrite for certain problem import statements.

Under certain conditions, `build-package` will add extensions to imported modules when the imported module does not (strictly) exist.
For example, this rewrites

```js
import * from "ol/proj/proj4";
```

to

```js
import * from "ol/proj/proj4.js";
```

While the first import works with bundlers such as Vite or Rollup, Node will refuse to import it.
Because node is strict about extensions, the first snippet cannot execute in some environments (such as Vitest).

This new behavior is intended as a fix for https://github.com/open-pioneer/trails-openlayers-base-packages/issues/314.
Please open an issue if this fix causes any problems for your packages.
