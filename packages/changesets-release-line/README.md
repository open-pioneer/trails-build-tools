# @open-pioneer/changelogs-release-line

This package provides a custom release line for `@changesets/cli` to be used in official Open Pioneer Trails repositories.
The custom release line does not list internal dependency updates in the changelogs.

## Use custom release line

Reference this package in changeset config (typically `./.changeset/config.json`).

```json
{
    ...
    "changelog": "@open-pioneer/changesets-release-line",
    ...
}
```
