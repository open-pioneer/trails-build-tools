// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { defineBuildConfig } from "@open-pioneer/build-support";

export default defineBuildConfig({
    entryPoints: ["index"],
    publicAssets: [
        { src: "public", dest: "." },
        { src: "./node_modules/third-party-lib/cdn", dest: "third-party-lib" }
    ],
    publishConfig: {
        strict: true,
        packageFormatTarget: "1.2"
    }
});
