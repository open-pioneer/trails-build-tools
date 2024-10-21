# @open-pioneer/check-pnpm-duplicates

Provides the `check-pnpm-duplicates` command line tool.
The tool checks the project's current pnpm lockfile for duplicate packages.
Any unexpected package duplications are reported as an error.

## Installation

```bash
$ pnpm add -D @open-pioneer/check-pnpm-duplicates
```

The tool can be invoked manually (via `pnpm check-pnpm-duplicates -c path/to/config.yaml`) or automatically as part of the `prepare` script:

```jsonc
// package.json
{
    "scripts": {
        "prepare": "check-pnpm-duplicates -c path/to/config.yaml"
    }
}
```

## Configuration

The tool can be configured using a YAML file.
This file allows you to specify a list of expected duplicates which are known to not cause any problems.

```yaml
# path/to/config.yaml
#
# This is the configuration file for the check-pnpm-duplicates CLI.
# See <https://www.npmjs.com/package/@open-pioneer/check-pnpm-duplicates> for more details.

# Ignore any duplicates in devDependencies.
skipDevDependencies: true

# List of packages that are allowed to have duplicates.
#
# You can list packages here that do not cause issues when they are present multiple times in your project.
# You SHOULD NOT list central dependencies here, such as react or any trails packages.
allowed:
    - "some-package-name"
```

## CLI Options

```text
$ pnpm check-pnpm-duplicates --help
Usage: check-pnpm-duplicates [options]

Checks a pnpm lockfile for duplicate packages.

Options:
  -c, --config <path>  path to the configuration file
  -d, --debug          show exception stack traces
  -V, --version        output the version number
  -h, --help           display help for command
```

## License

Apache-2.0 (see `LICENSE` file)
