// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";
import { packageNameToSlug, slugToPackageName } from "./packageSlug";

it.each([
    ["package-with-assets", "package-with-assets"],
    ["name_with.dots-and_underscores", "name_with.dots-and_underscores"],
    ["@scope/scoped-assets", "scope~scoped-assets"],
    ["@open-pioneer/map", "open-pioneer~map"],
    ["@my_org/a_b", "my_org~a_b"],
    ["@a_/b", "a_~b"],
    ["@a/_b", "a~_b"]
])("converts %j to the slug %j and back", (packageName, slug) => {
    expect(packageNameToSlug(packageName)).toBe(slug);
    expect(slugToPackageName(slug)).toBe(packageName);
});
