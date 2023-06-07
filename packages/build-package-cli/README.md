# @open-pioneer/build-package-cli

Provides the `build-pioneer-package` command line tool.

`build-pioneer-package` should be invoked from the package's source directory.
The package will then be built according to the instructions in the package's `build.config.mjs`:

```
$ build-pioneer-package
Building package at <...>
Building JavaScript...
Generating TypeScript declaration files...
Copying assets...
Writing package metadata...
Copying auxiliary files...
Success
```

## License

[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)
