// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import generate from "@babel/generator";
import template from "@babel/template";
import * as nodes from "@babel/types";
import { ReferenceConfig } from "@open-pioneer/build-support";
import { PackageMetadata } from "../metadata/MetadataRepository";
import { ReportableError } from "../ReportableError";
import { IdGenerator } from "./IdGenerator";

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

/**
 * Generates a combined metadata structure that is essentially a Record<string, metadata.PackageMetadata>.
 * The object contents must match the shape required by the runtime (declared in runtime/metadata/index.ts).
 */
export function generatePackagesMetadata(packages: PackageMetadataInput[]): string {
    const idGenerator = new IdGenerator();
    const packagesMetadata = nodes.objectExpression([]);
    const imports: nodes.Statement[] = [];
    for (const pkg of packages) {
        const packageMetadata = generatePackageMetadata(pkg, {
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
    }
): nodes.Expression {
    const servicesObject = nodes.objectExpression([]);
    for (const service of pkg.config.services) {
        if (!pkg.servicesModulePath) {
            throw new ReportableError(
                `Package '${pkg.name}' must have a valid services module (typically 'services.ts' or 'services.js').\n` +
                    "The entry point can be configured by setting the 'servicesModule' property in the build.config.mjs."
            );
        }

        const importName = options.importServiceClass(
            pkg.name + "_" + service.name,
            service.name,
            pkg.servicesModulePath
        );
        const serviceObject = SERVICE_OBJECT({
            SERVICE_NAME: nodes.stringLiteral(service.name),
            SERVICE_IMPORT: nodes.identifier(importName),
            SERVICE_INTERFACES: nodes.arrayExpression(
                service.provides.map((p) =>
                    INTERFACE_OBJECT({
                        INTERFACE_NAME: nodes.stringLiteral(p.name),
                        QUALIFIER:
                            p.qualifier == null ? undefinedNode() : nodes.stringLiteral(p.qualifier)
                    })
                )
            ),
            SERVICE_REFERENCES: nodes.objectExpression(
                Object.entries(service.references).map(([referenceName, referenceConfig]) =>
                    nodes.objectProperty(
                        nodes.stringLiteral(referenceName),
                        referenceObject(referenceConfig)
                    )
                )
            )
        });

        servicesObject.properties.push(
            nodes.objectProperty(nodes.stringLiteral(service.name), serviceObject)
        );
    }

    const uiObject = UI_OBJECT({
        UI_REFERENCES: nodes.arrayExpression(
            pkg.config.ui.references.map((r) => referenceObject(r))
        )
    });

    const propertiesObject = nodes.objectExpression(
        pkg.config.properties.map((prop) =>
            nodes.objectProperty(
                nodes.stringLiteral(prop.name),
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

function referenceObject(referenceConfig: ReferenceConfig): nodes.Expression {
    return REFERENCE_OBJECT({
        INTERFACE_NAME: nodes.stringLiteral(referenceConfig.name),
        QUALIFIER: referenceConfig.qualifier
            ? nodes.stringLiteral(referenceConfig.qualifier)
            : undefinedNode(),
        ALL: nodes.booleanLiteral(referenceConfig.all ?? false)
    });
}

function undefinedNode() {
    return nodes.unaryExpression("void", nodes.numericLiteral(0));
}
