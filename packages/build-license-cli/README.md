# @open-pioneer/build-package-cli

Provides the `build-pioneer-package` command line tool which compiles Open Pioneer Trails packages into a 'publishable' form.

Installation:

```bash
$ pnpm add -D @open-pioneer/build-package-cli
```

```text
$ pnpm build-pioneer-package --help
Usage: build-pioneer-package [options]

Builds an Open Pioneer Trails package for publishing.

Options:
  -p, --package <path>  package directory (defaults to current directory)
  -r, --root <path>     the root directory (optional, defaults to the workspace root)
  -q, --silent          disable logging
  -d, --debug           show exception stack traces
  -V, --version         output the version number
  -h, --help            display help for command
```

`build-pioneer-package` should be invoked from the package's source directory.
The package will then be built according to the instructions in the package's `build.config.mjs`.
The output will be written to the package's `dist` directory.

```text
$ build-pioneer-package
Building package at <...>
Building JavaScript...
Generating TypeScript declaration files...
Copying assets...
Writing package metadata...
Copying auxiliary files...
Success
```

To configure the build process, use the `publishConfig` section in your `build.config.mjs`.

## License

Apache-2.0 (see `LICENSE` file)
