---
"@open-pioneer/create-license-report": minor
---

Move the `--dev` CLI option into the license config file as `skipDevDependencies`.

Dev dependencies are now controlled via `license-config.yaml` (consistent with `check-pnpm-duplicates`):

```yaml
skipDevDependencies: true
```

`skipDevDependencies` defaults to `true` when omitted, so existing `license-config.yaml` files keep their previous behavior (dev dependencies excluded). The `--dev` command line flag has been removed.
