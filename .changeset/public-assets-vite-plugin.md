---
"@open-pioneer/vite-plugin-pioneer": minor
---

Support public assets of Trails packages.

A package lists its public asset directories under `publicAssets` in its `build.config.mjs`.

The development server serves these files on request, and the Vite build copies them into the output directory.

The new module `open-pioneer:assets` exports `publicAssetsUrl`, the root URL of the package's public assets, and `getPublicAssetUrl()`, which returns the URL of a specific asset.

```js
import { getPublicAssetUrl } from "open-pioneer:assets";

const assetUrl = getPublicAssetUrl("icons/my-icon.png");
```

The plugin also supports published packages with the package format version 1.2, which may define public assets of their own.
