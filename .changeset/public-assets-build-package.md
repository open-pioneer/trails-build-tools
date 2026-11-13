---
"@open-pioneer/build-package": minor
"@open-pioneer/build-package-cli": minor
---

Compile packages with public assets.

Public asset directories inside the package are copied into the compiled package.
This way, apps that use that package can copy the public assets into the final app output.

Packages may also declare public assets from one of their dependencies, for example `./node_modules/third-party-lib/cdn`.
The assets are then served as part of the package, but _they are not copied_.
Instead, the package must declare the package as a dependency.
Use this to integrate third party libraries into the Trails ecosystem. 

The feature require `packageFormatTarget: "1.2"` in the `publishConfig`.
App that use such a package needs a version of `@open-pioneer/vite-plugin-pioneer` that supports this format.
