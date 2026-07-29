---
"@open-pioneer/create-license-cli": minor
"@open-pioneer/build-common": minor
"@open-pioneer/build-package": minor
---

- Offer a License report tool, that can be used to replace the license script for current OPT Projects. 
- Add dev dependency support.
  - Dev dependencies are controlled via `license-config.yaml` : `skipDevDependencies: true` (default) or `false` to include dev dependencies.
- Support compound SPDX license expressions in `allowedLicenses`
