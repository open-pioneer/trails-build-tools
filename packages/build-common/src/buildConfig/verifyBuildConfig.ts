// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import {
    BuildConfig,
    PackageOverridesConfig,
    PropertyMetaConfig,
    ProvidesConfig,
    PublishConfig,
    ReferenceConfig,
    ServiceConfig,
    ServiceOverridesConfig,
    UiConfig,
    ValidationOptions
} from "@open-pioneer/build-support";
import { z } from "zod";
import { createErrorMap, fromZodError } from "zod-validation-error";
import type * as API from "../../types";

type VerifyBuildConfig = typeof API.verifyBuildConfig;

const LITERAL_SCHEMA = z.union([z.string(), z.number(), z.boolean(), z.null()]);

type Literal = z.infer<typeof LITERAL_SCHEMA>;

type Json = Literal | { [key: string]: Json } | Json[];

const JSON_SCHEMA: z.ZodType<Json> = z.lazy(() =>
    z.union([LITERAL_SCHEMA, z.array(JSON_SCHEMA), z.record(z.string(), JSON_SCHEMA)])
);

const PROPERTY_META_SCHEMA: z.ZodType<PropertyMetaConfig> = z.strictObject({
    required: z.boolean().optional()
});

const REFERENCE_CONFIG_SCHEMA: z.ZodType<ReferenceConfig> = z.strictObject({
    name: z.string(),
    qualifier: z.string().optional(),
    all: z.boolean().optional()
});

const PROVIDES_CONFIG_SCHEMA: z.ZodType<ProvidesConfig> = z.strictObject({
    name: z.string(),
    qualifier: z.string().optional()
});

const UI_CONFIG_SCHEMA: z.ZodType<UiConfig> = z.strictObject({
    references: z.array(z.string().or(REFERENCE_CONFIG_SCHEMA)).optional()
});

const SERVICE_CONFIG_SCHEMA: z.ZodType<ServiceConfig> = z.strictObject({
    provides: z
        .string()
        .or(z.array(z.string().or(PROVIDES_CONFIG_SCHEMA)))
        .optional(),
    references: z.record(z.string(), z.string().or(REFERENCE_CONFIG_SCHEMA)).optional()
});

const SERVICE_OVERRIDES_SCHEMA: z.ZodType<ServiceOverridesConfig> = z.strictObject({
    enabled: z.boolean().optional()
});

const PACKAGE_OVERRIDES_SCHEMA: z.ZodType<PackageOverridesConfig> = z.strictObject({
    services: z.record(z.string(), SERVICE_OVERRIDES_SCHEMA).optional()
});

const VALIDATION_OPTIONS_SCHEMA: z.ZodType<ValidationOptions> = z.strictObject({
    requireLicense: z.boolean().optional(),
    requireReadme: z.boolean().optional(),
    requireChangelog: z.boolean().optional()
});

const PUBLISH_CONFIG_SCHEMA: z.ZodType<PublishConfig> = z.strictObject({
    assets: z.string().or(z.array(z.string())).optional(),
    types: z.boolean().optional(),
    sourceMaps: z.boolean().optional(),
    strict: z.boolean().optional(),
    validation: VALIDATION_OPTIONS_SCHEMA.optional()
});

const BUILD_CONFIG_SCHEMA: z.ZodType<BuildConfig> = z.strictObject({
    entryPoints: z.string().or(z.string().array()).optional(),
    styles: z.string().optional(),
    i18n: z.array(z.string()).optional(),
    services: z.record(z.string(), SERVICE_CONFIG_SCHEMA).optional(),
    servicesModule: z.string().optional(),
    ui: UI_CONFIG_SCHEMA.optional(),
    properties: z.record(z.string(), JSON_SCHEMA).optional(),
    propertiesMeta: z.record(z.string(), PROPERTY_META_SCHEMA).optional(),
    overrides: z.record(z.string(), PACKAGE_OVERRIDES_SCHEMA).optional(),
    publishConfig: PUBLISH_CONFIG_SCHEMA.optional()
});

const ERROR_MAP = createErrorMap();

/**
 * Ensures that `value` conforms to the {@link BuildConfig} interface.
 * Throws an error if that is not the case.
 *
 * @returns `value` but casted to the appropriate type.
 */
export const verifyBuildConfig: VerifyBuildConfig = function verifyBuildConfig(value) {
    const result = BUILD_CONFIG_SCHEMA.safeParse(value, { error: ERROR_MAP });
    if (result.success) {
        return result.data;
    }
    throw fromZodError(result.error);
};
