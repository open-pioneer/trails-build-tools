// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import { PackageOverrides, Reference, Service, UiReference } from "@open-pioneer/build-common";
import type { Expression, ImportDeclaration, ObjectExpression, Property } from "estree";
import { PackageMetadata } from "../metadata/Metadata";
import { ReportableError } from "../ReportableError";
import {
    array,
    exportDefault,
    identifier,
    importNamed,
    jsonToExpression,
    literal,
    object,
    printProgram,
    property,
    undefinedValue
} from "./ast";
import { IdGenerator } from "./IdGenerator";

export type PackageMetadataInput = Pick<PackageMetadata, "name" | "config" | "servicesModulePath">;

export interface PackageMetadataOptions {
    /**
     * The name of the current application.
     * Used to detect the application page for overrides.
     */
    appName: string;

    /**
     * Set of packages to generate code for.
     */
    packages: PackageMetadataInput[];
}

/**
 * Generates a combined metadata structure that is essentially a Record<string, metadata.PackageMetadata>.
 * The object contents must match the shape required by the runtime (declared in runtime/metadata/index.ts).
 */
export function generatePackagesMetadata({ appName, packages }: PackageMetadataOptions): string {
    const idGenerator = new IdGenerator();
    const imports: ImportDeclaration[] = [];
    const packageProperties: Property[] = [];

    let overrides: Map<string, PackageOverrides> | undefined;
    for (const pkg of packages) {
        if (pkg.name === appName) {
            overrides = pkg.config.overrides;
        } else if (pkg.config.overrides) {
            throw new ReportableError(
                `Unexpected 'overrides' in package '${pkg.name}'. Overrides are only supported in the app.`
            );
        }
    }

    for (const pkg of packages) {
        const packageOverrides = overrides?.get(pkg.name);
        const packageMetadata = generatePackageMetadata(pkg, {
            enableService(serviceName) {
                return packageOverrides?.services?.get(serviceName)?.enabled ?? true;
            },
            importServiceClass(variableName, className, moduleId) {
                const id = idGenerator.generate(variableName);
                imports.push(importNamed(className, id, moduleId));
                return id;
            }
        });
        packageProperties.push(
            property(pkg.name, packageMetadata, { comment: `Package '${pkg.name}'` })
        );
    }

    return printProgram([
        ...imports,
        exportDefault(object(packageProperties), {
            comment: "Metadata of all packages, keyed by package name"
        })
    ]);
}

/**
 * Generates the metadata object for a single package.
 * As a side effect, service imports for required service classes will be emitted through a callback.
 */
function generatePackageMetadata(
    pkg: PackageMetadataInput,
    options: {
        /**
         * Adds an import to the containing module.
         * Returns the actual variable name associated with the service.
         */
        importServiceClass(variableName: string, className: string, entryPoint: string): string;

        /**
         * Returns true if the service shall be included in the generated code, false otherwise.
         */
        enableService(serviceName: string): boolean;
    }
): ObjectExpression {
    const serviceProperties: Property[] = [];
    for (const service of pkg.config.services.values()) {
        if (!options.enableService(service.serviceName)) {
            continue;
        }

        if (!pkg.servicesModulePath) {
            throw new ReportableError(
                `Package '${pkg.name}' must have a valid services module (typically 'services.ts' or 'services.js').\n` +
                    "The entry point can be configured by setting the 'servicesModule' property in the build.config.mjs."
            );
        }

        const importName = options.importServiceClass(
            pkg.name + "_" + service.serviceName,
            service.serviceName,
            pkg.servicesModulePath
        );
        serviceProperties.push(
            property(service.serviceName, serviceObject(service, importName), {
                comment: `Service '${service.serviceName}'`
            })
        );
    }

    const uiReferences = pkg.config.uiReferences.map(referenceObject);
    const propertyProperties = Array.from(pkg.config.properties.values(), (prop) =>
        property(
            prop.propertyName,
            object([
                property("value", jsonToExpression(prop.defaultValue)),
                property("required", literal(prop.required))
            ])
        )
    );

    return object([
        property("name", literal(pkg.name)),
        property("services", object(serviceProperties)),
        property("ui", object([property("references", array(uiReferences))])),
        property("properties", object(propertyProperties))
    ]);
}

function serviceObject(service: Service, importName: string): ObjectExpression {
    const provides = service.provides.map((p) =>
        object([
            property("name", literal(p.interfaceName)),
            property("qualifier", optionalString(p.qualifier))
        ])
    );
    const references = Array.from(service.references, ([referenceName, ref]) =>
        property(referenceName, referenceObject(ref))
    );
    return object([
        property("name", literal(service.serviceName)),
        property("clazz", identifier(importName)),
        property("provides", array(provides)),
        property("references", object(references))
    ]);
}

function referenceObject(ref: Reference | UiReference): ObjectExpression {
    return object([
        property("name", literal(ref.interfaceName)),
        property("qualifier", optionalString(ref.qualifier)),
        property("all", literal(ref.type === "all")) // TODO: Rework internal app format
    ]);
}

/** `"value"` or `void 0` */
function optionalString(value: string | undefined): Expression {
    return value == null ? undefinedValue() : literal(value);
}
