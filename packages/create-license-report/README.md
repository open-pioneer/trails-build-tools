# @open-pioneer/create-license-report

Provides the `create-license-report` command line tool which creates a license report html file.

## Installation

```bash
$ pnpm add -D @open-pioneer/create-license-report
```

```text
$ pnpm create-license-report --help
Usage: create-license-report [options]

Create a license file for Open Pioneer Trails

Options:
  -c, --config <path>       path to the license config file (default: "support/license-config.yaml")
  -p, --packageJson <path>  path to the package.json (default: "package.json")
  -o, --output <path>       path to the result file (default: "dist/license-report.html")
  -q, --silent              disable logging (default: false)
  -x, --debug               show exception stack traces (default: false)
  -V, --version             output the version number
  -h, --help                display help for command
```

## Usage

`create-license-report` should be invoked from the package's source directory.
The license report will be built, based on the packages of `package.json` and the configuration set in `license-config.yaml`.
The default output will be written to the package's `dist` directory.

```text
> pnpm create-license-report
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

# Skip dev dependencies in the report. Optional, defaults to `true`.
skipDevDependencies: true

overrideLicenses:
    - name: "package-a"
      version: "1.0.0"
      license: "MIT"

additionalLicenses:
    - name: "package-b"
      license: "ISC"
      licenseFiles:
          - custom: "./licenses/pacakge-b_isc"
```

The allowed licenses are the licenses that are allowed for the dependencies. If a dependency has a license that is not in the allowed licenses, it will be reported
and the build will fail. The override licenses can be used to override the license of a dependency. This is useful if the license cannot be automatically detected.
The additional licenses can be used to add additional licenses that are not automatically detected. This is useful for packages that do not have a license file or a license field in their package.json.

`skipDevDependencies` controls whether dev dependencies are excluded from the report. It defaults to `true` when omitted, so older `license-config.yaml` files keep their previous behavior.

### Compound SPDX license expressions

A dependency's license may be a compound [SPDX license expression](https://spdx.org/licenses/), e.g. `"MIT AND BSD-3-Clause"` or `"(MPL-2.0 OR Apache-2.0)"`. These are evaluated with [`spdx-satisfies`](https://www.npmjs.com/package/spdx-satisfies):

- `AND`: every license in the expression must be listed in `allowedLicenses`.
- `OR`: allowed as soon as at least one of the alternatives is listed in `allowedLicenses`.

If a dependency's license expression cannot be satisfied this way (or a specific license should be forced regardless), add an explicit `overrideLicenses` entry for that dependency; its `license` value replaces the whole expression.

## License

Apache-2.0 (see `LICENSE` file)
