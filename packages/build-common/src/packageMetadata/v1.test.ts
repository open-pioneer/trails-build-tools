// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { CURRENT_VERSION, parsePackageMetadata, serializePackageMetadata } from "./v1";
import { PackageMetadataV1 } from "../..";

describe("packageMetadata v1", function () {
    it("fails to parse an object without a version", function () {
        const result = parsePackageMetadata({});
        delete (result as any).cause;
        expect(result).toMatchInlineSnapshot(`
          {
            "code": "validation-error",
            "message": "Expected a json object with a valid value for 'packageFormatVersion'.",
            "type": "error",
          }
        `);
    });

    it("fails to parse when version is not supported", function () {
        const result = parsePackageMetadata({
            packageFormatVersion: "999.999.999"
        });
        expect(result).toMatchInlineSnapshot(`
          {
            "code": "unsupported-version",
            "message": "The version of this package cannot read framework metadata of version 999.999.999.",
            "type": "error",
          }
        `);
    });

    it("fails to parse when schema is violated", function () {
        const result = parsePackageMetadata({
            packageFormatVersion: CURRENT_VERSION,
            services: 123
        });
        expect(result).toMatchInlineSnapshot(`
          {
            "cause": [ZodError: [
            {
              "code": "invalid_type",
              "expected": "array",
              "received": "number",
              "path": [
                "services"
              ],
              "message": "Expected array, received number"
            }
          ]],
            "code": "validation-error",
            "message": "Metadata validation failed.",
            "type": "error",
          }
        `);
    });

    it("succeeds to parse simple metadata", function () {
        const result = parsePackageMetadata({
            packageFormatVersion: CURRENT_VERSION,
            services: [],
            properties: [],
            styles: "./foo.css"
        });
        expect(result).toMatchInlineSnapshot(`
          {
            "type": "success",
            "value": {
              "packageFormatVersion": "1.0.0",
              "properties": [],
              "services": [],
              "styles": "./foo.css",
            },
          }
        `);
    });

    it("serializes and parses valid metadata objects", function () {
        const metadata: PackageMetadataV1.PackageMetadata = {
            packageFormatVersion: "filled-in",
            services: [
                {
                    serviceName: "A",
                    provides: [
                        {
                            interfaceName: "foo"
                        },
                        {
                            interfaceName: "bar",
                            qualifier: "baz"
                        }
                    ],
                    references: [
                        {
                            interfaceName: "i1",
                            referenceName: "r1",
                            type: "unique"
                        },
                        {
                            interfaceName: "i2",
                            qualifier: "q",
                            referenceName: "r2",
                            type: "all"
                        }
                    ]
                }
            ],
            ui: {
                references: [
                    {
                        interfaceName: "i1",
                        type: "unique"
                    },
                    {
                        interfaceName: "i2",
                        qualifier: "q",
                        type: "all"
                    }
                ]
            },
            servicesModule: "./my-services",
            styles: "./my-styles.scss",
            i18n: {
                languages: ["x", "y"]
            },
            properties: [
                {
                    value: 123,
                    propertyName: "x",
                    required: true
                },
                {
                    value: null,
                    propertyName: "y",
                    required: false
                }
            ]
        };
        const serialized = serializePackageMetadata(metadata);
        const parseResult = parsePackageMetadata(serialized);
        expect(parseResult.type).toBe("success");

        const value = (parseResult as any).value;
        const expectedValue = {
            ...metadata,
            packageFormatVersion: CURRENT_VERSION // filled in during serialize
        };
        expect(value).toMatchObject(expectedValue);
    });
});
