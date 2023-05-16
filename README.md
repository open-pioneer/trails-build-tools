# build-tools

![Build status](https://github.com/open-pioneer/build-tools/actions/workflows/test-and-build.yml/badge.svg) ![Dependency audit](https://github.com/open-pioneer/build-tools/actions/workflows/audit-dependencies.yml/badge.svg)

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

This repository uses [Changesets](https://github.com/changesets/changesets) to manage versioning and publishing.
When implementing a change, don't forget to add an appropriate changeset by running `pnpm changeset add`.

The publish workflow (see `.github/workflows` directory) automatically creates a prepared pull request
with version updates and changelog entries derived from the changesets in the repository.
To release changed packages, simply merge the pull request.

Useful local commands:

```bash
$ pnpm changeset        # Create a new changeset ("add" is optional)
$ pnpm changeset status # Show which packages would be published, verify configuration
```

Things to keep in mind:

-   There should currently be no pending changesets for ignored packages (`ignore` in `.changeset/config.json`).
    Otherwise the merged versions PR will not trigger a publish.

## License

```
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
```
