---
"@open-pioneer/vite-plugin-pioneer": minor
---

Support public assets of Trails packages.

Packages lists its their public asset directories under `publicAssets` in their `build.config.mjs`.

The development server serves these files on request, and the Vite build copies them into the output directory.

The new module `open-pioneer:assets` exports `publicAssetsUrl` (which returns the root URL to the package's assets) and `getPublicAssetUrl()`, which returns the URL of a specific asset.

```js
import { getPublicAssetUrl } from "open-pioneer:assets";

const assetUrl = getPublicAssetUrl("icons/my-icon.png");
```

The plugin also reads published packages with the package format version 1.2, which may define public assets of their own.
