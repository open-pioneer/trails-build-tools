# @open-pioneer/build-pioneer-license

Provides the `build-pioneer-license` command line tool which creates a license report html file.

## Installation

```bash
$ pnpm add -D @open-pioneer/build-pioneer-license
```

```text
$ pnpm build-pioneer-license --help
Usage: build-pioneer-license [options]

Create a license file for Open Pioneer Trails

Options:
  -c, --config <path>       path to the license config file (default: "support/license-config.yaml")
  -p, --packageJson <path>  path to the package.json (default: "package.json")
  -o, --output <path>       path to the result file (default: "dist/license-report.html")
  -d, --dev                 include dev dependencies (default: false)
  -q, --silent              disable logging (default: false)
  -x, --debug               show exception stack traces (default: false)
  -V, --version             output the version number
  -h, --help                display help for command
```

## Usage

`build-pioneer-license` should be invoked from the package's source directory.
The license report will be built, based on the packages of `package.json` and the configuration set in `license-config.yaml`.
The default output will be written to the package's `dist` directory.

```text
> pnpm build-pioneer-license
Start creating license report
Using license config from .\support\license-config.yaml , packagejson from .\package.json and write the result into .\dist\license-report.html
License report finished successfully. Report written to .\dist\license-report.html
```

## Configuration

The license report can be configured via a yaml file. The default path for this file is `support/license-config.yaml`.
Here is an example of the configuration file:

```yaml
allowedLicenses:
    - "Apache-2.0"
    - "MIT"

overrideLicenses:
    - name: "rgbcolor"
      version: "1.0.1"
      license: "MIT"

additionalLicenses:
    - name: "Lucide"
      license: "ISC"
      licenseFiles:
          - custom: "./licenses/lucide_isc"
```

The allowed licenses are the licenses that are allowed for the dependencies. If a dependency has a license that is not in the allowed licenses, it will be reported
and the build will fail. The override licenses can be used to override the license of a dependency. This is useful if the license cannot be automatically detected.
The additional licenses can be used to add additional licenses that are not automatically detected. This is useful for packages that do not have a license file or a license field in their package.json.

## License

Apache-2.0 (see `LICENSE` file)
