---
"@open-pioneer/vite-plugin-pioneer": patch
---

Emit better errors when an application's i18n configuration does not match the supported locales of its dependencies.

This can happen if:

- An application does not list the `i18n` option in its `build.config.mjs` at all, or if
- there is no overlap between the application's locales and the locales supported by one of its dependencies.

The vite plugin will now throw errors such as this to make it easier to detect the issue:

```
[plugin:pioneer:codegen] Invalid i18n configuration in application at <...>/src/samples/chakra-sample/chakra-app:
There is no match between the locales supported by the application (none) and the locales supported by the packages '@open-pioneer/chakra-snippets' (de, en).
```
