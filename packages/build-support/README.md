# @open-pioneer/build-support

Provides the `defineBuildConfig` function and associated TypeScript interfaces.
This enables auto completion in `build.config.mjs` files.

## Example

```js
// build.config.mjs
import { defineBuildConfig } from "@open-pioneer/build-support";

export default defineBuildConfig({
    styles: "./styles.css",
    ui: {
        references: ["some.example.Interface"]
    }
});
```

## License

```
Copyright 2023 con terra GmbH and contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
