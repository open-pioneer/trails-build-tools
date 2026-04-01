---
"@open-pioneer/vite-plugin-pioneer": minor
---

Support a new virtual module to get the current deployment's base URL both during development and production:

```ts
import { baseUrl } from "open-pioneer:deployment";

// Base URL of the deployed application, for example:
// - http://localhost:5173/ or http://localhost:5173/optional/path/ (during development)
// - https://example.com/path/to/root/ (during production)
console.log(baseUrl);
```
