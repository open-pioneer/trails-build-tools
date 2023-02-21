// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { assert } from "chai";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { GENERATE_SNAPSHOTS, TEST_DATA } from "../utils/testUtils";
import { generatePackagesMetadata } from "./generatePackagesMetadata";

describe("generatePackagesMetadata", function () {
    it("should generate package metadata", function () {
        const testDataFile = resolve(TEST_DATA, "codegen-metadata.js");
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
                entryPointPath: "entryPoint"
            }
        ]);

        if (GENERATE_SNAPSHOTS) {
            writeFileSync(testDataFile, pkgMetadata, "utf-8");
        }

        const expected = readFileSync(testDataFile, "utf-8").trim();
        assert.equal(pkgMetadata, expected);
    });
});
