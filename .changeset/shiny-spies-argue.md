---
"@open-pioneer/create-license-report": minor
---

Reject SPDX license expressions that combine licenses with `OR` (e.g. `"(MIT OR Apache-2.0)"`), even if one of the alternatives is allowed. The license choice is ambiguous, so the report now fails with an error asking the user to resolve it explicitly, either by adding an override to `overrideLicenses` or by adding the exact expression text to `allowedLicenses`.
