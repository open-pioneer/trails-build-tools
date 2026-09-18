# @open-pioneer/create-license-report

Provides the `create-license-report` command line tool, which can be used to generate a full license report for a pnpm-based project.

The tool collects the licenses of a project's dependencies with `pnpm licenses list`, checks them against a list of allowed licenses and writes an HTML report that contains the license texts.
A dependency with a missing, unknown or disallowed license fails the run.

`create-license-report` requires **pnpm 11** or later.

## Installation

```bash
$ pnpm add -D @open-pioneer/create-license-report
```

```text
$ pnpm create-license-report --help
Usage: create-license-report [options]

Creates an HTML license report for the dependencies of a project.

Options:
  -w, --working-dir <path>  project directory (defaults to the current directory)
  -c, --config <path>       path to the license config file (default: "support/license-config.yaml")
  -o, --output <path>       path to the generated report (default: "dist/license-report.html")
  -q, --silent              disable logging
  -d, --debug               show exception stack traces
  -V, --version             output the version number
  -h, --help                display help for command
```

## Usage

Run `create-license-report` in the project directory, or point it there with `--working-dir`.
The directory must contain the project's `package.json` and be installed with pnpm.
The config and output paths are resolved relative to that directory.

```text
$ pnpm create-license-report
Start creating license report
Using license config from /project/support/license-config.yaml, package.json from /project/package.json and writing result to /project/dist/license-report.html
License report finished successfully. Report written to /project/dist/license-report.html
```

## Configuration

The license report can be configured using a YAML file.
The default path for this file is `support/license-config.yaml`.

For example:

```yaml
# support/license-config.yaml

# Licenses that dependencies may use (SPDX ids).
# See also https://spdx.org/licenses/
allowedLicenses:
    - "Apache-2.0"
    - "MIT"

# Exclude dev dependencies from the report. Optional, defaults to true.
skipDevDependencies: true

# Replaces licensing data for a certain package / version.
overrideLicenses:
    - name: "package-a"
      version: "1.0.0"
      license: "MIT"
      # Optional. Paths relative to the package directory (`package`) or to this config file (`custom`).
      # A plain string is a package relative path. Without this entry the tool looks for a LICENSE file itself.
      licenseFiles:
          - "LICENSE-MIT.txt"
          - custom: "./licenses/package-a"
      noticeFiles:
          - "NOTICE"

# Adds entries that pnpm does not know about, e.g. bundled third party code.
additionalLicenses:
    - name: "package-b"
      version: "2.0.0" # optional
      license: "ISC"
      licenseFiles:
          - custom: "./licenses/package-b_isc"
```

An override that matches no dependency is reported as a warning, so stale entries are noticed after an update.

### SPDX identifiers

Use SPDX license identifiers to define which licenses are allowed.
See <https://spdx.org/licenses/> for a full list.

### Compound SPDX license expressions

A dependency's license may be a compound [SPDX license expression](https://spdx.org/licenses/), e.g. `MIT AND BSD-3-Clause` or `(MPL-2.0 OR Apache-2.0)`.
Expressions are evaluated with [`spdx-satisfies`](https://www.npmjs.com/package/spdx-satisfies).

- `AND`: every license in the expression must be listed in `allowedLicenses`.
- `OR`: rejected, even if one of the alternatives is allowed, because the expression leaves the actual license open.
  Make the choice explicit, either with an `overrideLicenses` entry that replaces the expression with one license, or by adding the expression text verbatim (e.g. `"(MPL-2.0 OR Apache-2.0)"`) to `allowedLicenses`.

### License overrides

Some packages do not contain license files, or they contain them in unusual locations.
The `overrideLicenses` option can be used to define or replace license data for a specific package/version combination:

```yaml
overrideLicenses:
    # Overrides the license id
    - name: "package-a"
      version: "1.0.0"
      license: "MIT"

    # Defines custom license files that would not have been found by this tool.
    # By default, paths are resolved relative to the _package_.
    - name: "pako"
      version: "2.1.0"
      license: "MIT and Zlib"
      licenseFiles:
          - "./LICENSE"
          - "./lib/zlib/README"

    # Some packages do not ship with a license file (in node_modules).
    # You can define a custom license file (provided that it is actually valid).
    #
    # The `custom:` key tells the tool to look for the license file relative its configuration file.
    # This way, the license can be checked into the source tree.
    - name: "package-with-missing-license"
      version: "1.2.3"
      license: "MIT"
      licenseFiles:
          - custom: "./licenses/license_obtained_from_author.md"
```

## License

Apache-2.0 (see `LICENSE` file)
