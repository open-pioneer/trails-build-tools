// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import type * as API from "../../types";
import {
    BuildConfig,
    PackageOverridesConfig,
    PropertyMetaConfig,
    ReferenceConfig,
    ServiceConfig,
    ServiceOverridesConfig
} from "@open-pioneer/build-support";
import { MIN_SUPPORTED_RUNTIME_VERSION } from "../buildConfig";

export const createPackageConfigFromBuildConfig: typeof API.createPackageConfigFromBuildConfig =
    normalizeConfig;
export const createPackageConfigFromPackageMetadata: typeof API.createPackageConfigFromPackageMetadata =
    readConfig;

function normalizeConfig(rawConfig: BuildConfig): API.PackageConfig {
    const services = new Map<string, API.Service>();
    if (rawConfig.services) {
        for (const [serviceName, serviceConfig] of Object.entries(rawConfig.services)) {
            addService(services, normalizeService(serviceName, serviceConfig));
        }
    }

    const uiReferences: API.UiReference[] = [];
    if (rawConfig.ui?.references) {
        for (const referenceConfig of rawConfig.ui.references) {
            uiReferences.push(normalizeUIReference(referenceConfig));
        }
    }

    let servicesModule = rawConfig.servicesModule ?? undefined;
    if (servicesModule == null && services.size > 0) {
        servicesModule = "./services";
    }

    const styles = rawConfig.styles ?? undefined;

    const languages = new Set<string>();
    if (rawConfig.i18n) {
        for (const lang of rawConfig.i18n) {
            addLanguage(languages, lang);
        }
    }

    const properties = new Map<string, API.Property>();
    if (rawConfig.properties) {
        for (const [propertyName, propertyConfig] of Object.entries(rawConfig.properties)) {
            addProperty(
                properties,
                normalizeProperty(
                    propertyName,
                    propertyConfig,
                    rawConfig.propertiesMeta?.[propertyName]
                )
            );
        }
    }

    let overrides;
    if (rawConfig.overrides) {
        overrides = new Map<string, API.PackageOverrides>();
        for (const [packageName, packageOverrides] of Object.entries(rawConfig.overrides)) {
            addPackageOverrides(
                overrides,
                normalizePackageOverrides(packageName, packageOverrides)
            );
        }
    }
    const runtimeVersion = MIN_SUPPORTED_RUNTIME_VERSION;

    return {
        services,
        servicesModule,
        uiReferences,
        styles,
        languages,
        properties,
        overrides,
        runtimeVersion
    };
}

function normalizeService(serviceName: string, rawConfig: ServiceConfig): API.Service {
    const provides = normalizeProvides(rawConfig.provides);
    const references = new Map<string, API.Reference>();
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
): API.Reference {
    return {
        referenceName: referenceName,
        ...normalizeReferenceCommon(referenceConfig)
    };
}

function normalizeUIReference(referenceConfig: string | ReferenceConfig): API.UiReference {
    return normalizeReferenceCommon(referenceConfig);
}

function normalizeReferenceCommon(
    referenceConfig: string | ReferenceConfig
): Omit<API.Reference, "referenceName"> {
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

function normalizeProvides(rawConfig: ServiceConfig["provides"]): API.ProvidedInterface[] {
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

        return { interfaceName, qualifier } satisfies API.ProvidedInterface;
    });
}

function normalizeProperty(
    propertyName: string,
    value: unknown,
    meta: PropertyMetaConfig | undefined
): API.Property {
    return {
        propertyName,
        defaultValue: value,
        required: meta?.required ?? false
    };
}

function normalizePackageOverrides(
    packageName: string,
    overrides: PackageOverridesConfig
): API.PackageOverrides {
    const services = new Map<string, API.ServiceOverrides>();
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
): API.ServiceOverrides {
    return {
        serviceName,
        enabled: overrides.enabled ?? undefined
    };
}

function readConfig(metadata: API.PackageMetadataV1.PackageMetadata): API.PackageConfig {
    const services = new Map<string, API.Service>();
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

    const properties = new Map<string, API.Property>();
    if (metadata.properties?.length) {
        for (const prop of metadata.properties) {
            addProperty(properties, readProperty(prop));
        }
    }

    return {
        services,
        servicesModule: metadata.servicesModule ?? undefined,
        styles: metadata.styles ?? undefined,
        languages,
        uiReferences: readUiReferences(metadata.ui),
        properties,
        overrides: undefined,
        runtimeVersion: metadata.runtimeVersion
    };
}

function readService(metadata: API.PackageMetadataV1.ServiceConfig): API.Service {
    const references = new Map<string, API.Reference>();
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

function readProvides(metadata: API.PackageMetadataV1.ProvidesConfig): API.ProvidedInterface {
    return {
        interfaceName: metadata.interfaceName,
        qualifier: metadata.interfaceName ?? undefined
    };
}

function readReference(metadata: API.PackageMetadataV1.ReferenceConfig): API.Reference {
    return {
        type: metadata.type,
        referenceName: metadata.referenceName,
        interfaceName: metadata.interfaceName,
        qualifier: metadata.qualifier ?? undefined
    };
}

function readUiReferences(
    metadata: API.PackageMetadataV1.UiConfig | null | undefined
): API.UiReference[] {
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

function readProperty(property: API.PackageMetadataV1.PropertyConfig): API.Property {
    return {
        propertyName: property.propertyName,
        defaultValue: property.value,
        required: property.required ?? false
    };
}

function addService(services: Map<string, API.Service>, service: API.Service) {
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

function addReference(references: Map<string, API.Reference>, reference: API.Reference) {
    if (references.has(reference.referenceName)) {
        throw new Error(`Reference '${reference.referenceName}' is already defined.`);
    }
    references.set(reference.referenceName, reference);
}

function addProperty(properties: Map<string, API.Property>, property: API.Property) {
    if (properties.has(property.propertyName)) {
        throw new Error(`Property '${property.propertyName}' is already defined.`);
    }
    properties.set(property.propertyName, property);
}

function addPackageOverrides(
    packages: Map<string, API.PackageOverrides>,
    overrides: API.PackageOverrides
) {
    if (packages.has(overrides.packageName)) {
        throw new Error(`Overrides for package '${overrides.packageName}' are already defined.`);
    }
    packages.set(overrides.packageName, overrides);
}

function addServiceOverrides(
    services: Map<string, API.ServiceOverrides>,
    overrides: API.ServiceOverrides
) {
    if (services.has(overrides.serviceName)) {
        throw new Error(`Overrides for service '${overrides.serviceName}' are already defined.`);
    }
    services.set(overrides.serviceName, overrides);
}
