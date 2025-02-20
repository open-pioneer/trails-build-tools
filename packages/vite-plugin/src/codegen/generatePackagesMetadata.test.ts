// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { createPackageConfigFromBuildConfig } from "@open-pioneer/build-common";
import { describe, expect, it } from "vitest";
import { generatePackagesMetadata } from "./generatePackagesMetadata";

describe("generatePackagesMetadata", function () {
    it("should generate package metadata", function () {
        const pkgConfig = createPackageConfigFromBuildConfig({
            services: {
                ServiceA: {
                    provides: [],
                    references: {}
                },
                ServiceB: {
                    provides: [
                        {
                            name: "ServiceC",
                            qualifier: "C"
                        }
                    ],
                    references: {
                        asd: {
                            name: "ServiceD",
                            qualifier: "D"
                        }
                    }
                }
            },
            ui: {
                references: [{ name: "foo.ServiceE" }, { name: "foo.ServiceF", qualifier: "F" }]
            },
            properties: {
                some_property: "default_value",
                complex_property: {
                    array: [
                        1,
                        2,
                        {
                            a: 3
                        },
                        [[[[[1]]]]]
                    ],
                    bool: false,
                    n: 123132,
                    str: "foo"
                }
            },
            propertiesMeta: {
                some_property: {
                    required: true
                }
            },
            overrides: {}
        });

        const code = generatePackagesMetadata({
            appName: "test",
            packages: [
                {
                    name: "test",
                    servicesModulePath: "entryPoint",
                    config: pkgConfig
                }
            ]
        });

        expect(code).toMatchInlineSnapshot(`
          "import { ServiceA as test_ServiceA } from "entryPoint";
          import { ServiceB as test_ServiceB } from "entryPoint";
          export default {
            "test": {
              name: "test",
              services: {
                "ServiceA": {
                  name: "ServiceA",
                  clazz: test_ServiceA,
                  provides: [],
                  references: {}
                },
                "ServiceB": {
                  name: "ServiceB",
                  clazz: test_ServiceB,
                  provides: [{
                    name: "ServiceC",
                    qualifier: "C"
                  }],
                  references: {
                    "asd": {
                      name: "ServiceD",
                      qualifier: "D",
                      all: false
                    }
                  }
                }
              },
              ui: {
                references: [{
                  name: "foo.ServiceE",
                  qualifier: void 0,
                  all: false
                }, {
                  name: "foo.ServiceF",
                  qualifier: "F",
                  all: false
                }]
              },
              properties: {
                "some_property": {
                  value: "default_value",
                  required: true
                },
                "complex_property": {
                  value: {
                    "array": [1, 2, {
                      "a": 3
                    }, [[[[[1]]]]]],
                    "bool": false,
                    "n": 123132,
                    "str": "foo"
                  },
                  required: false
                }
              }
            }
          };"
        `);
    });
});
