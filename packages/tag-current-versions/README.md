# @open-pioneer/tag-current-versions

**Archived: This package is no longer being developed. `changeset tag` can now be used instead, since it can filter private packages now.**

---

Creates `git` tags for all packages in the current workspace, according to the `version` field in their `package.json`.

Only those packages are tagged that have a valid version and are not `private`.

This is a variant of [changeset tag](https://github.com/changesets/changesets/blob/8ede784e5fc3629858a57643fdaab76ffb631520/packages/cli/src/commands/tag/index.ts),
which does not skip over private packages.
