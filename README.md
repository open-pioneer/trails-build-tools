# build-tools

This package contains build tools required by the open pioneer framework.

## Development Notes

### Windows users

If you're developing the build tools on windows, you will likely have to Window's support für symbolic links.
This is needed for the plugin tests: they emulate a pnpm monorepo with local links via manual symlinks.

To enable symbolic links on windows you need to enable windows developer mode
(German Windows 11: Einstellungen > Datenschutz und Sicherheit > Für Entwickler > Entwicklermodus).
Additionally, you need to set the following git config: `git config --global core.symlinks true`.
If this setting was not enabled from the beginning, it might be necessary to set up the project
again from scratch to avoid problems with link creation.

### Releasing

Use the [publish action](https://github.com/open-pioneer/build-tools/actions/workflows/publish.yml) to trigger an npm release of a package.
The action accepts two version numbers: the version to release (may be the same as in the current package.json) and the next development version (which must be different).

## License

Copyright 2023 con terra GmbH and contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
