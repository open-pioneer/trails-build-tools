// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { BuildConfig } from "@open-pioneer/build-support";
import { describe, expect, it } from "vitest";
import {
    createPackageConfigFromBuildConfig,
    createPackageConfigFromPackageMetadata,
    PackageMetadataV1 as V1
} from "../..";

describe("packageConfig", function () {
    it("maps build.config.mjs contents to internal representation", function () {
        const buildConfig: BuildConfig = {
            services: {
                A: {
                    provides: [
                        "foo",
                        {
                            name: "bar",
                            qualifier: "baz"
                        }
                    ],
                    references: {
                        r1: "i1",
                        r2: {
                            name: "i2",
                            qualifier: "q",
                            all: true
                        }
                    }
                }
            },
            i18n: ["x", "y"],
            styles: "./my-styles.scss",
            servicesModule: "./my-services",
            ui: {
                references: [
                    "i1",
                    {
                        name: "i2",
                        qualifier: "q",
                        all: true
                    }
                ]
            },
            properties: {
                x: 123,
                y: null
            },
            propertiesMeta: {
                x: {
                    required: true
                }
            },
            overrides: {
                otherPackage: {
                    services: {
                        otherService: {
                            enabled: false
                        }
                    }
                }
            }
        };
        const packageConfig = createPackageConfigFromBuildConfig(buildConfig);
        expect(packageConfig).toMatchInlineSnapshot(`
          {
            "languages": Set {
              "x",
              "y",
            },
            "overrides": Map {
              "otherPackage" => {
                "packageName": "otherPackage",
                "services": Map {
                  "otherService" => {
                    "enabled": false,
                    "serviceName": "otherService",
                  },
                },
              },
            },
            "properties": Map {
              "x" => {
                "defaultValue": 123,
                "propertyName": "x",
                "required": true,
              },
              "y" => {
                "defaultValue": null,
                "propertyName": "y",
                "required": false,
              },
            },
            "runtimeVersion": undefined,
            "services": Map {
              "A" => {
                "provides": [
                  {
                    "interfaceName": "foo",
                    "qualifier": undefined,
                  },
                  {
                    "interfaceName": "bar",
                    "qualifier": "baz",
                  },
                ],
                "references": Map {
                  "r1" => {
                    "interfaceName": "i1",
                    "qualifier": undefined,
                    "referenceName": "r1",
                    "type": "unique",
                  },
                  "r2" => {
                    "interfaceName": "i2",
                    "qualifier": "q",
                    "referenceName": "r2",
                    "type": "all",
                  },
                },
                "serviceName": "A",
              },
            },
            "servicesModule": "./my-services",
            "styles": "./my-styles.scss",
            "uiReferences": [
              {
                "interfaceName": "i1",
                "qualifier": undefined,
                "type": "unique",
              },
              {
                "interfaceName": "i2",
                "qualifier": "q",
                "type": "all",
              },
            ],
          }
        `);
    });

    it("maps package metadata to internal representation", function () {
        const metadata: V1.PackageMetadata = {
            packageFormatVersion: V1.CURRENT_VERSION,
            services: [
                {
                    serviceName: "A",
                    provides: [
                        {
                            interfaceName: "foo",
                            qualifier: undefined
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
        const packageConfig = createPackageConfigFromPackageMetadata(metadata);
        expect(packageConfig).toMatchInlineSnapshot(`
          {
            "languages": Set {
              "x",
              "y",
            },
            "overrides": undefined,
            "properties": Map {
              "x" => {
                "defaultValue": 123,
                "propertyName": "x",
                "required": true,
              },
              "y" => {
                "defaultValue": null,
                "propertyName": "y",
                "required": false,
              },
            },
            "runtimeVersion": undefined,
            "services": Map {
              "A" => {
                "provides": [
                  {
                    "interfaceName": "foo",
                    "qualifier": "foo",
                  },
                  {
                    "interfaceName": "bar",
                    "qualifier": "bar",
                  },
                ],
                "references": Map {
                  "r1" => {
                    "interfaceName": "i1",
                    "qualifier": undefined,
                    "referenceName": "r1",
                    "type": "unique",
                  },
                  "r2" => {
                    "interfaceName": "i2",
                    "qualifier": "q",
                    "referenceName": "r2",
                    "type": "all",
                  },
                },
                "serviceName": "A",
              },
            },
            "servicesModule": "./my-services",
            "styles": "./my-styles.scss",
            "uiReferences": [
              {
                "interfaceName": "i1",
                "qualifier": undefined,
                "type": "unique",
              },
              {
                "interfaceName": "i2",
                "qualifier": "q",
                "type": "all",
              },
            ],
          }
        `);
    });
});
