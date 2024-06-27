---
"@open-pioneer/build-package-cli": minor
"@open-pioneer/build-package": minor
---

Introduce an option to configure the root directory (`-r` for the CLI, `rootDirectory` for the JavaScript API).

The root directory is used to detect which packages are local to the project.
The option defaults to the root of the current workspace (e.g. the PNPM workspace root), or, if that doesn't work, to the root of the current git repository.
However, it can also be configured manually.
