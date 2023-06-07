---
"@open-pioneer/vite-plugin-pioneer": patch
---

Don't consider virtual app-css modules if they end in '.map'. This is a workaround for vite currently requesting source maps for inline css with the 'wrong' importer.
