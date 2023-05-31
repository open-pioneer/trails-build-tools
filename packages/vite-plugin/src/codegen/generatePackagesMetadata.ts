// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import generate from "@babel/generator";
import template from "@babel/template";
import * as nodes from "@babel/types";
import { PackageMetadata } from "../metadata/Metadata";
import { ReportableError } from "../ReportableError";
import { IdGenerator } from "./IdGenerator";
import { PackageOverrides, Reference, UiReference } from "@open-pioneer/build-common";

const SERVICE_IMPORT = template.statement(`
    import { %%SERVICE_NAME%% as %%IMPORT_NAME%% } from %%IMPORT_SOURCE%%;
`);

const PKG_OBJECT = template.expression(`
    {
        name: %%PACKAGE_NAME%%,
        services: %%PACKAGE_SERVICES%%,
        ui: %%PACKAGE_UI%%,
        properties: %%PROPERTIES%%
    }
`);

const SERVICE_OBJECT = template.expression(`
    {
        name: %%SERVICE_NAME%%,
        clazz: %%SERVICE_IMPORT%%,
        provides: %%SERVICE_INTERFACES%%,
        references: %%SERVICE_REFERENCES%%
    }
`);

const INTERFACE_OBJECT = template.expression(`
    {
        name: %%INTERFACE_NAME%%,
        qualifier: %%QUALIFIER%%
    }
`);

const REFERENCE_OBJECT = template.expression(`
    {
        name: %%INTERFACE_NAME%%,
        qualifier: %%QUALIFIER%%,
        all: %%ALL%%
    }
`);

const UI_OBJECT = template.expression(`
    {
        references: %%UI_REFERENCES%%
    }
`);

const PROPERTY_OBJECT = template.expression(`
    {
        value: %%VALUE%%,
        required: %%REQUIRED%%
    }
`);

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
    const packagesMetadata = nodes.objectExpression([]);
    const imports: nodes.Statement[] = [];

    let overrides: Map<string, PackageOverrides> | undefined;
    for (const pkg of packages) {
        if (pkg.name === appName) {
            overrides = pkg.config.overrides;
        } else if (pkg.config.overrides.size > 0) {
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
                const renderedImporter = SERVICE_IMPORT({
                    SERVICE_NAME: nodes.identifier(className),
                    IMPORT_NAME: nodes.identifier(id),
                    IMPORT_SOURCE: nodes.stringLiteral(moduleId)
                });
                imports.push(renderedImporter);
                return id;
            }
        });
        packagesMetadata.properties.push(
            nodes.objectProperty(nodes.stringLiteral(pkg.name), packageMetadata)
        );
    }

    const program = nodes.program([...imports, nodes.exportDefaultDeclaration(packagesMetadata)]);
    return generate(program).code;
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
): nodes.Expression {
    const servicesObject = nodes.objectExpression([]);
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
        const serviceObject = SERVICE_OBJECT({
            SERVICE_NAME: nodes.stringLiteral(service.serviceName),
            SERVICE_IMPORT: nodes.identifier(importName),
            SERVICE_INTERFACES: nodes.arrayExpression(
                service.provides.map((p) =>
                    INTERFACE_OBJECT({
                        INTERFACE_NAME: nodes.stringLiteral(p.interfaceName),
                        QUALIFIER:
                            p.qualifier == null ? undefinedNode() : nodes.stringLiteral(p.qualifier)
                    })
                )
            ),
            SERVICE_REFERENCES: nodes.objectExpression(
                Array.from(service.references.entries()).map(([referenceName, referenceConfig]) =>
                    nodes.objectProperty(
                        nodes.stringLiteral(referenceName),
                        referenceObject(referenceConfig)
                    )
                )
            )
        });

        servicesObject.properties.push(
            nodes.objectProperty(nodes.stringLiteral(service.serviceName), serviceObject)
        );
    }

    const uiObject = UI_OBJECT({
        UI_REFERENCES: nodes.arrayExpression(pkg.config.uiReferences.map((r) => referenceObject(r)))
    });

    const propertiesObject = nodes.objectExpression(
        Array.from(pkg.config.properties.values()).map((prop) =>
            nodes.objectProperty(
                nodes.stringLiteral(prop.propertyName),
                PROPERTY_OBJECT({
                    VALUE: jsonToExpression(prop.defaultValue),
                    REQUIRED: nodes.booleanLiteral(prop.required)
                })
            )
        )
    );

    const pkgObject = PKG_OBJECT({
        PACKAGE_NAME: nodes.stringLiteral(pkg.name),
        PACKAGE_SERVICES: servicesObject,
        PACKAGE_UI: uiObject,
        PROPERTIES: propertiesObject
    });
    return pkgObject;
}

function jsonToExpression(json: unknown): nodes.Expression {
    if (json == null) {
        return nodes.nullLiteral();
    }
    if (typeof json === "string") {
        return nodes.stringLiteral(json);
    }
    if (typeof json === "number") {
        return nodes.numericLiteral(json);
    }
    if (typeof json === "boolean") {
        return nodes.booleanLiteral(json);
    }
    if (Array.isArray(json)) {
        return nodes.arrayExpression(json.map((item) => jsonToExpression(item)));
    }
    if (typeof json === "object") {
        return nodes.objectExpression(
            Object.entries(json).map(([name, value]) =>
                nodes.objectProperty(nodes.stringLiteral(name), jsonToExpression(value))
            )
        );
    }
    throw new Error(`Unexpected value while serializing JSON: ${json}.`);
}

function referenceObject(ref: Reference | UiReference): nodes.Expression {
    return REFERENCE_OBJECT({
        INTERFACE_NAME: nodes.stringLiteral(ref.interfaceName),
        QUALIFIER: ref.qualifier ? nodes.stringLiteral(ref.qualifier) : undefinedNode(),
        ALL: nodes.booleanLiteral(ref.type === "all" ? true : false) // TODO: Rework internal app format
    });
}

function undefinedNode() {
    return nodes.unaryExpression("void", nodes.numericLiteral(0));
}
