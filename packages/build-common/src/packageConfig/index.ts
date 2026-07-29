// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import {
    BuildConfig,
    PackageOverridesConfig,
    PropertyMetaConfig,
    ReferenceConfig,
    ServiceConfig,
    ServiceOverridesConfig
} from "@open-pioneer/build-support";
import type {
    PropertyConfig as MetadataPropertyConfig,
    ProvidesConfig as MetadataProvidesConfig,
    ReferenceConfig as MetadataReferenceConfig,
    ServiceConfig as MetadataServiceConfig,
    UiConfig as MetadataUiConfig,
    PackageMetadata
} from "../packageMetadata/v1";

/** Internal representation of a package. */
export interface PackageConfig {
    /** Services, if any, indexed by name. */
    services: Map<string, Service>;

    /** Entry point for services. */
    servicesModule: string | undefined;

    /** Css entry point, if any. */
    styles: string | undefined;

    /** Supported languages. */
    languages: Set<string>;

    /** UI config */
    uiReferences: UiReference[];

    /** Package properties. */
    properties: Map<string, Property>;

    /**
     * Overrides for other packages, indexed by package name.
     * This is undefined if the package does not use the 'overrides' property.
     */
    overrides: Map<string, PackageOverrides> | undefined;

    /** Optional runtime metadata set by the package. */
    runtimeMeta?: {
        /** The metadata version supported by the package. */
        metadataVersion?: string;
    };
}

/** Internal representation of a service. */
export interface Service {
    /** Service name (unique). */
    serviceName: string;

    /** Provided interfaces, if any. */
    provides: ProvidedInterface[];

    /** References to other services, indexed by name. */
    references: Map<string, Reference>;
}

/** Represents an interface provided by a service. */
export interface ProvidedInterface {
    /** Interface name. */
    interfaceName: string;

    /** Additional qualifier. */
    qualifier: string | undefined;
}

/** Represents a reference required by a service. */
export interface Reference {
    /** Type of reference (single unique match, or 'get all implementations'). */
    type: "unique" | "all";

    /** Reference name (unique). */
    referenceName: string;

    /** Referenced interface name. */
    interfaceName: string;

    /** Additional qualifier. */
    qualifier: string | undefined;
}

/** Represents a reference required by the UI. */
export type UiReference = Omit<Reference, "referenceName">;

/** Internal representation of a property. */
export interface Property {
    /** Property name (unique). */
    propertyName: string;

    /** Initial property value (may be undefined). */
    defaultValue: unknown;

    /** True: must be set to a non-null value at runtime. */
    required: boolean;
}

/** Holds overrides for things in a packages. Only allowed in apps. */
export interface PackageOverrides {
    /** Name of the package. */
    packageName: string;

    /** Overrides for services, indexed by service name. */
    services: Map<string, ServiceOverrides>;
}

/** Overrides for a single service. */
export interface ServiceOverrides {
    /** Name of the service. */
    serviceName: string;

    /** Enable or disable a service from another package. */
    enabled?: boolean | undefined;
}

/**
 * Extracts the package configuration from the parsed build config file.
 */
export function createPackageConfigFromBuildConfig(buildConfig: BuildConfig): PackageConfig {
    const services = new Map<string, Service>();
    if (buildConfig.services) {
        for (const [serviceName, serviceConfig] of Object.entries(buildConfig.services)) {
            addService(services, normalizeService(serviceName, serviceConfig));
        }
    }

    const uiReferences: UiReference[] = [];
    if (buildConfig.ui?.references) {
        for (const referenceConfig of buildConfig.ui.references) {
            uiReferences.push(normalizeUIReference(referenceConfig));
        }
    }

    let servicesModule = buildConfig.servicesModule ?? undefined;
    if (servicesModule == null && services.size > 0) {
        servicesModule = "./services";
    }

    const styles = buildConfig.styles ?? undefined;

    const languages = new Set<string>();
    if (buildConfig.i18n) {
        for (const lang of buildConfig.i18n) {
            addLanguage(languages, lang);
        }
    }

    const properties = new Map<string, Property>();
    if (buildConfig.properties) {
        for (const [propertyName, propertyConfig] of Object.entries(buildConfig.properties)) {
            addProperty(
                properties,
                normalizeProperty(
                    propertyName,
                    propertyConfig,
                    buildConfig.propertiesMeta?.[propertyName]
                )
            );
        }
    }

    let overrides;
    if (buildConfig.overrides) {
        overrides = new Map<string, PackageOverrides>();
        for (const [packageName, packageOverrides] of Object.entries(buildConfig.overrides)) {
            addPackageOverrides(
                overrides,
                normalizePackageOverrides(packageName, packageOverrides)
            );
        }
    }

    let runtimeMeta;
    if (buildConfig.runtimeMeta) {
        runtimeMeta = buildConfig.runtimeMeta;
    }

    return {
        services,
        servicesModule,
        uiReferences,
        styles,
        languages,
        properties,
        overrides,
        runtimeMeta
    };
}

function normalizeService(serviceName: string, rawConfig: ServiceConfig): Service {
    const provides = normalizeProvides(rawConfig.provides);
    const references = new Map<string, Reference>();
    if (rawConfig.references) {
        for (const [referenceName, referenceConfig] of Object.entries(rawConfig.references)) {
            addReference(references, normalizeReference(referenceName, referenceConfig));
        }
    }

    return {
        serviceName,
        provides,
        references
    };
}

function normalizeReference(
    referenceName: string,
    referenceConfig: string | ReferenceConfig
): Reference {
    return {
        referenceName: referenceName,
        ...normalizeReferenceCommon(referenceConfig)
    };
}

function normalizeUIReference(referenceConfig: string | ReferenceConfig): UiReference {
    return normalizeReferenceCommon(referenceConfig);
}

function normalizeReferenceCommon(
    referenceConfig: string | ReferenceConfig
): Omit<Reference, "referenceName"> {
    let type: "all" | "unique" = "unique";
    let qualifier = undefined;
    let interfaceName;
    if (typeof referenceConfig === "string") {
        interfaceName = referenceConfig;
    } else {
        if (referenceConfig.all) {
            type = "all";
        }
        if (referenceConfig.qualifier) {
            qualifier = referenceConfig.qualifier;
        }
        interfaceName = referenceConfig.name;
    }

    return {
        type,
        interfaceName,
        qualifier
    };
}

function normalizeProvides(rawConfig: ServiceConfig["provides"]): ProvidedInterface[] {
    if (!rawConfig) {
        return [];
    }

    if (typeof rawConfig === "string") {
        return [
            {
                interfaceName: rawConfig,
                qualifier: undefined
            }
        ];
    }

    return rawConfig.map((providesConfig) => {
        let interfaceName;
        let qualifier = undefined;
        if (typeof providesConfig === "string") {
            interfaceName = providesConfig;
        } else {
            interfaceName = providesConfig.name;
            if (providesConfig.qualifier) {
                qualifier = providesConfig.qualifier;
            }
        }

        return { interfaceName, qualifier } satisfies ProvidedInterface;
    });
}

function normalizeProperty(
    propertyName: string,
    value: unknown,
    meta: PropertyMetaConfig | undefined
): Property {
    return {
        propertyName,
        defaultValue: value,
        required: meta?.required ?? false
    };
}

function normalizePackageOverrides(
    packageName: string,
    overrides: PackageOverridesConfig
): PackageOverrides {
    const services = new Map<string, ServiceOverrides>();
    if (overrides.services) {
        for (const [serviceName, serviceOverrides] of Object.entries(overrides.services)) {
            addServiceOverrides(services, normalizeServiceOverrides(serviceName, serviceOverrides));
        }
    }

    return {
        packageName,
        services
    };
}

function normalizeServiceOverrides(
    serviceName: string,
    overrides: ServiceOverridesConfig
): ServiceOverrides {
    return {
        serviceName,
        enabled: overrides.enabled ?? undefined
    };
}

/**
 * Extracts the package configuration from the given package metadata object.
 */
export function createPackageConfigFromPackageMetadata(metadata: PackageMetadata): PackageConfig {
    const services = new Map<string, Service>();
    if (metadata.services?.length) {
        for (const service of metadata.services) {
            addService(services, readService(service));
        }
    }

    const languages = new Set<string>();
    if (metadata.i18n?.languages?.length) {
        for (const lang of metadata.i18n.languages) {
            addLanguage(languages, lang);
        }
    }

    const properties = new Map<string, Property>();
    if (metadata.properties?.length) {
        for (const prop of metadata.properties) {
            addProperty(properties, readProperty(prop));
        }
    }

    let runtimeMeta: PackageConfig["runtimeMeta"];
    if (metadata.runtimeMeta) {
        runtimeMeta = {
            metadataVersion: metadata.runtimeMeta.metadataVersion ?? undefined
        };
    }

    return {
        services,
        servicesModule: metadata.servicesModule ?? undefined,
        styles: metadata.styles ?? undefined,
        languages,
        uiReferences: readUiReferences(metadata.ui),
        properties,
        overrides: undefined,
        runtimeMeta
    };
}

function readService(metadata: MetadataServiceConfig): Service {
    const references = new Map<string, Reference>();
    if (metadata.references?.length) {
        for (const reference of metadata.references) {
            addReference(references, readReference(reference));
        }
    }

    return {
        serviceName: metadata.serviceName,
        provides: metadata.provides?.map((p) => readProvides(p)) ?? [],
        references
    };
}

function readProvides(metadata: MetadataProvidesConfig): ProvidedInterface {
    return {
        interfaceName: metadata.interfaceName,
        qualifier: metadata.qualifier ?? undefined
    };
}

function readReference(metadata: MetadataReferenceConfig): Reference {
    return {
        type: metadata.type,
        referenceName: metadata.referenceName,
        interfaceName: metadata.interfaceName,
        qualifier: metadata.qualifier ?? undefined
    };
}

function readUiReferences(metadata: MetadataUiConfig | null | undefined): UiReference[] {
    return (
        metadata?.references?.map((ref) => {
            return {
                type: ref.type,
                interfaceName: ref.interfaceName,
                qualifier: ref.qualifier ?? undefined
            };
        }) ?? []
    );
}

function readProperty(property: MetadataPropertyConfig): Property {
    return {
        propertyName: property.propertyName,
        defaultValue: property.defaultValue,
        required: property.required ?? false
    };
}

function addService(services: Map<string, Service>, service: Service) {
    if (services.has(service.serviceName)) {
        throw new Error(`Service '${service.serviceName}' is already defined.`);
    }
    services.set(service.serviceName, service);
}

function addLanguage(languages: Set<string>, lang: string) {
    if (languages.has(lang)) {
        throw new Error(`Language '${lang}' is already defined.`);
    }
    languages.add(lang);
}

function addReference(references: Map<string, Reference>, reference: Reference) {
    if (references.has(reference.referenceName)) {
        throw new Error(`Reference '${reference.referenceName}' is already defined.`);
    }
    references.set(reference.referenceName, reference);
}

function addProperty(properties: Map<string, Property>, property: Property) {
    if (properties.has(property.propertyName)) {
        throw new Error(`Property '${property.propertyName}' is already defined.`);
    }
    properties.set(property.propertyName, property);
}

function addPackageOverrides(packages: Map<string, PackageOverrides>, overrides: PackageOverrides) {
    if (packages.has(overrides.packageName)) {
        throw new Error(`Overrides for package '${overrides.packageName}' are already defined.`);
    }
    packages.set(overrides.packageName, overrides);
}

function addServiceOverrides(services: Map<string, ServiceOverrides>, overrides: ServiceOverrides) {
    if (services.has(overrides.serviceName)) {
        throw new Error(`Overrides for service '${overrides.serviceName}' are already defined.`);
    }
    services.set(overrides.serviceName, overrides);
}
