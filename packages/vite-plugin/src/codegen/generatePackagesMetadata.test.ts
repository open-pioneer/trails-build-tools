// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { generatePackagesMetadata } from "./generatePackagesMetadata";

describe("generatePackagesMetadata", function () {
    it("should generate package metadata", function () {
        const pkgMetadata = generatePackagesMetadata([
            {
                name: "test",
                config: {
                    styles: undefined,
                    i18n: undefined,
                    services: [
                        {
                            name: "ServiceA",
                            provides: [],
                            references: {}
                        },
                        {
                            name: "ServiceB",
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
                    ],
                    servicesModule: undefined,
                    ui: {
                        references: [
                            { name: "foo.ServiceE" },
                            { name: "foo.ServiceF", qualifier: "F" }
                        ]
                    },
                    properties: [
                        {
                            name: "some_property",
                            defaultValue: "default_value",
                            required: true
                        },
                        {
                            name: "complex_property",
                            defaultValue: {
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
                            },
                            required: false
                        }
                    ]
                },
                servicesModulePath: "entryPoint"
            }
        ]);

        expect(pkgMetadata).toMatchInlineSnapshot(`
          "import { ServiceA as test_ServiceA } from \\"entryPoint\\";
          import { ServiceB as test_ServiceB } from \\"entryPoint\\";
          export default {
            \\"test\\": {
              name: \\"test\\",
              services: {
                \\"ServiceA\\": {
                  name: \\"ServiceA\\",
                  clazz: test_ServiceA,
                  provides: [],
                  references: {}
                },
                \\"ServiceB\\": {
                  name: \\"ServiceB\\",
                  clazz: test_ServiceB,
                  provides: [{
                    name: \\"ServiceC\\",
                    qualifier: \\"C\\"
                  }],
                  references: {
                    \\"asd\\": {
                      name: \\"ServiceD\\",
                      qualifier: \\"D\\",
                      all: false
                    }
                  }
                }
              },
              ui: {
                references: [{
                  name: \\"foo.ServiceE\\",
                  qualifier: void 0,
                  all: false
                }, {
                  name: \\"foo.ServiceF\\",
                  qualifier: \\"F\\",
                  all: false
                }]
              },
              properties: {
                \\"some_property\\": {
                  value: \\"default_value\\",
                  required: true
                },
                \\"complex_property\\": {
                  value: {
                    \\"array\\": [1, 2, {
                      \\"a\\": 3
                    }, [[[[[1]]]]]],
                    \\"bool\\": false,
                    \\"n\\": 123132,
                    \\"str\\": \\"foo\\"
                  },
                  required: false
                }
              }
            }
          };"
        `);
    });
});
