# @open-pioneer/pnpm-plugin-defaults

Provides default configuration options for pnpm.

## Installation

Via pnpm:

```bash
$ pnpm install --config @open-pioneer/pnpm-plugin-defaults@$VERSION
```

Or manually, in your `pnpm-workspace.yaml`:

```yaml
# pnpm-workspace.yaml
configDependencies:
    "@open-pioneer/pnpm-plugin-defaults": $VERSION+sha512-$HASH
```

You can determine the sha512 hash by retrieving it from the registry:

```bash
$ pnpm show @open-pioneer/pnpm-plugin-defaults@0.0.2

@open-pioneer/pnpm-plugin-defaults@0.0.2 | Apache-2.0 | deps: none | versions: 2

...

dist
.tarball: https://registry.npmjs.org/@open-pioneer/pnpm-plugin-defaults/-/pnpm-plugin-defaults-0.0.2.tgz
.shasum: c16028c190edd60fb9f56b0d98dd00192cfc1b8b
.integrity: sha512-teU9ABBYp95Xz0g6hcSLb4+Ydo7i2oISykYjXHWlgQClt6yeiRbnTxBkr7AghQOdUxwJbtiyopR8aw5tf5ws0A==

...
```

## Default options

| Option                   | Value                                | Note                                                                   |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------------------- |
| allowUnusedPatches       | `true`                               |
| ignorePatchFailures      | `false`                              |
| strictPeerDependencies   | `true`                               |
| linkWorkspacePackages    | `false`                              | Use `workspace:` protocol to link local packages                       |
| resolutionMode           | `"time-based"`                       | Prefers older packages (see <https://pnpm.io/settings#resolutionmode>) |
| minimumReleaseAge        | `4320` (3 days)                      | Only install new versions after some time has passed                   |
| minimumReleaseAgeExclude | `["@conterra/*", "@open-pioneer/*"]` | Packages excluded from the `minimumReleaseAge` rule                    |
