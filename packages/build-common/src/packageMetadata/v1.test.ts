// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
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
              "expected": "array",
              "code": "invalid_type",
              "path": [
                "services"
              ],
              "message": "Invalid input: expected array, received number"
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
        const metadata: PackageMetadataV1.OutputPackageMetadata = {
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
                    defaultValue: 123,
                    propertyName: "x",
                    required: true
                },
                {
                    defaultValue: null,
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

    it("serializes and parses valid metadata objects", function () {
        const metadata: PackageMetadataV1.PackageMetadata = {
            packageFormatVersion: "1.0.9999999"
        };
        expect(() => serializePackageMetadata(metadata)).toThrowErrorMatchingInlineSnapshot(
            `[Error: Invalid package metadata version '1.0.9999999': version should either be omitted or be equal to the current version.]`
        );
    });

    it("parses real world metadata from package.json", function () {
        const packageJsonData = JSON.parse(REAL_PACKAGE_METADATA);
        const frameworkMetadata = packageJsonData[PackageMetadataV1.PACKAGE_JSON_KEY];
        const parsedMetadata = parsePackageMetadata(frameworkMetadata);
        if (parsedMetadata.type === "error") {
            throw Error("Unexpected parse error: " + parsedMetadata.message);
        }

        const data = parsedMetadata.value;
        expect(data).toMatchInlineSnapshot(`
          {
            "i18n": {
              "languages": [
                "en",
                "de",
              ],
            },
            "packageFormatVersion": "1.0.0",
            "properties": [
              {
                "defaultValue": {
                  "circle-fill-color": "red",
                  "circle-radius": 3,
                  "circle-stroke-color": "red",
                  "circle-stroke-width": 1.25,
                  "fill-color": "rgba(255,255,255,0.4)",
                  "stroke-color": "red",
                  "stroke-width": 1.25,
                },
                "propertyName": "polygonStyle",
                "required": false,
              },
              {
                "defaultValue": {
                  "circle-fill-color": "red",
                  "circle-radius": 3,
                  "circle-stroke-color": "red",
                  "circle-stroke-width": 1.25,
                },
                "propertyName": "vertexStyle",
                "required": false,
              },
            ],
            "services": [
              {
                "provides": [
                  {
                    "interfaceName": "editing.EditingService",
                  },
                ],
                "references": [
                  {
                    "interfaceName": "map.MapRegistry",
                    "referenceName": "mapRegistry",
                    "type": "unique",
                  },
                  {
                    "interfaceName": "map.LayerFactory",
                    "referenceName": "layerFactory",
                    "type": "unique",
                  },
                  {
                    "interfaceName": "http.HttpService",
                    "referenceName": "httpService",
                    "type": "unique",
                  },
                ],
                "serviceName": "EditingServiceImpl",
              },
            ],
            "servicesModule": "./services",
            "styles": "./editing.css",
            "ui": {
              "references": [],
            },
          }
        `);
    });
});

const REAL_PACKAGE_METADATA = `
{
  "type": "module",
  "name": "@open-pioneer/editing",
  "version": "1.2.0",
  "description": "This package provides an editing service that allows to start and handle geometry editing workflows.",
  "keywords": [
    "open-pioneer-trails"
  ],
  "homepage": "https://github.com/open-pioneer",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/open-pioneer/trails-openlayers-base-packages",
    "directory": "src/packages/editing"
  },
  "dependencies": {
    "@open-pioneer/core": "^4.4.0",
    "@open-pioneer/http": "^4.4.0",
    "@open-pioneer/runtime": "^4.4.0",
    "ol": "^10.7.0",
    "@conterra/reactivity-core": "^0.8.1",
    "@open-pioneer/map": "1.2.0"
  },
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "import": "./index.js",
      "types": "./index.d.ts"
    },
    "./services": {
      "import": "./services.js",
      "types": "./services.d.ts"
    },
    "./editing.css": "./editing.css"
  },
  "openPioneerFramework": {
    "styles": "./editing.css",
    "services": [
      {
        "serviceName": "EditingServiceImpl",
        "provides": [
          {
            "interfaceName": "editing.EditingService"
          }
        ],
        "references": [
          {
            "referenceName": "mapRegistry",
            "type": "unique",
            "interfaceName": "map.MapRegistry"
          },
          {
            "referenceName": "layerFactory",
            "type": "unique",
            "interfaceName": "map.LayerFactory"
          },
          {
            "referenceName": "httpService",
            "type": "unique",
            "interfaceName": "http.HttpService"
          }
        ]
      }
    ],
    "servicesModule": "./services",
    "i18n": {
      "languages": [
        "en",
        "de"
      ]
    },
    "ui": {
      "references": []
    },
    "properties": [
      {
        "propertyName": "polygonStyle",
        "defaultValue": {
          "fill-color": "rgba(255,255,255,0.4)",
          "stroke-color": "red",
          "stroke-width": 1.25,
          "circle-radius": 3,
          "circle-fill-color": "red",
          "circle-stroke-width": 1.25,
          "circle-stroke-color": "red"
        },
        "required": false
      },
      {
        "propertyName": "vertexStyle",
        "defaultValue": {
          "circle-radius": 3,
          "circle-fill-color": "red",
          "circle-stroke-width": 1.25,
          "circle-stroke-color": "red"
        },
        "required": false
      }
    ],
    "packageFormatVersion": "1.0.0"
  }
}
`;
