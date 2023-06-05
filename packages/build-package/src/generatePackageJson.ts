// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { Service, PackageMetadataV1 as V1 } from "@open-pioneer/build-common";
import { existsSync } from "node:fs";
import posix from "node:path/posix";
import nativePath from "node:path";
import { ValidationOptions } from "../types";
import { PackageModel } from "./model/PackageModel";
import { Logger } from "./utils/Logger";
import { ValidationReporter } from "./utils/ValidationReporter";

type SimplePackageModel = Pick<
    PackageModel,
    "input" | "jsEntryPoints" | "servicesEntryPoint" | "cssEntryPoint" | "outputDirectory"
>;

export interface GeneratePackageJsonOptions {
    model: SimplePackageModel;

    logger: Logger;

    reporter: ValidationReporter;
}

// These fields are simply copied to the destination package.json
// See https://docs.npmjs.com/cli/v9/configuring-npm/package-json
const COPY_FIELDS = [
    "name",
    "version",
    "description",
    "keywords",
    "homepage",
    "bugs",
    "license",
    "author",
    "contributors",
    "funding",
    "repository",
    "dependencies",
    "peerDependencies",
    "peerDependenciesMeta",
    "engines",
    "os",
    "cpu",
    "private"
];

/**
 * Generates the content of a package.json file for the package to be published.
 *
 * The contents are derived from the source package's package.json, the build config
 * and - possibly - global options.
 *
 * The package.json carries custom open pioneer framework metadata (these are in turn
 * read by the vite plugin in the app).
 */
export async function generatePackageJson({
    model,
    reporter
}: GeneratePackageJsonOptions): Promise<Record<string, unknown>> {
    const sourcePackageJson = model.input.packageJson;
    const sourcePackageJsonPath = model.input.packageJsonPath;

    // Check source package.json
    validatePackageJson(sourcePackageJson, sourcePackageJsonPath, model.input.validation, reporter);

    // Generate package.json for publishing
    const packageJson: Record<string, unknown> = {
        type: "module"
    };
    for (const field of COPY_FIELDS) {
        if (Object.hasOwn(sourcePackageJson, field)) {
            packageJson[field] = sourcePackageJson[field];
        }
    }
    packageJson.exports = generateExports(model, reporter);
    packageJson.openPioneerFramework = generateMetadata(model);

    // Clone (for safety) and also strip 'undefined' values.
    return JSON.parse(JSON.stringify(packageJson));
}

function validatePackageJson(
    sourcePackageJson: Record<string, unknown>,
    sourcePackageJsonPath: string,
    validation: Required<ValidationOptions>,
    validationErrors: ValidationReporter
) {
    if (!sourcePackageJson.name) {
        validationErrors.report(`${sourcePackageJsonPath} should define a name.`);
    }
    if (!sourcePackageJson.version) {
        validationErrors.report(`${sourcePackageJsonPath} should define a version.`);
    }
    if (sourcePackageJson.exports) {
        validationErrors.report(
            `${sourcePackageJsonPath} contains 'exports', these will be overwritten by generated exports.`
        );
    }
    if (validation.requireLicense && !sourcePackageJson.license) {
        validationErrors.report(`${sourcePackageJsonPath} should define a license.`);
    }

    if (
        !sourcePackageJson.publishConfig ||
        (sourcePackageJson.publishConfig as any).directory !== "dist" // eslint-disable-line @typescript-eslint/no-explicit-any
    ) {
        validationErrors.report(
            `${sourcePackageJsonPath} should define 'publishConfig.directory' to point to the 'dist' directory (see https://pnpm.io/package_json#publishconfigdirectory).`
        );
    }
}

function generateExports(model: SimplePackageModel, validationErrors: ValidationReporter) {
    // Assemble the `exports` field. This makes the files defined here "importable".
    // See https://nodejs.org/api/packages.html#package-entry-points
    const exportedModules: Record<string, unknown> = {};
    const addEntryPoint = (key: string, value: unknown) => {
        if (!key.startsWith(".")) {
            throw new Error(`Internal error: entry point '${key}' must start with '.'`);
        }
        if (Object.hasOwn(exportedModules, key)) {
            validationErrors.report(
                `Entry point '${key}' is already defined, this occurrence will be ignored.`
            );
            return;
        }
        exportedModules[key] = value;
    };
    addEntryPoint("./package.json", "./package.json");
    for (const entryPoint of model.jsEntryPoints) {
        const exportedName = getExportName(entryPoint.outputModuleId);
        const jsPath = `./${entryPoint.outputModuleId}.js`;
        const exportEntry: Record<string, string> = {
            import: jsPath
        };

        const dtsPath = `./${entryPoint.outputModuleId}.d.ts`;
        if (existsSync(nativePath.resolve(model.outputDirectory, dtsPath))) {
            exportEntry.types = dtsPath;
        }

        addEntryPoint(exportedName, exportEntry);
    }
    if (model.cssEntryPoint) {
        const exportedName = `./${model.cssEntryPoint.outputModuleId}.css`;
        addEntryPoint(exportedName, exportedName);
    }
    return exportedModules;
}

function getExportName(moduleId: string) {
    if (moduleId === "index") {
        return ".";
    }
    if (posix.basename(moduleId) === "index") {
        return "./" + posix.dirname(moduleId);
    }
    return `./${moduleId}`;
}

function generateMetadata(model: SimplePackageModel): unknown {
    const pkgConfig = model.input.packageConfig;
    const metadata: V1.OutputPackageMetadata = {
        styles: model.cssEntryPoint ? `./${model.cssEntryPoint.outputModuleId}.css` : undefined,
        services: writeServices(Array.from(pkgConfig.services.values())),
        servicesModule: model.servicesEntryPoint?.outputModuleId
            ? `./${model.servicesEntryPoint.outputModuleId}`
            : undefined,
        i18n: {
            languages: Array.from(pkgConfig.languages)
        },
        ui: {
            references: Array.from(pkgConfig.uiReferences)
        },
        properties: Array.from(pkgConfig.properties.values())
    };
    return V1.serializePackageMetadata(metadata);
}

function writeServices(services: Service[]): V1.ServiceConfig[] {
    return services.map(({ serviceName, provides, references }) => {
        return {
            serviceName,
            provides,
            references: Array.from(references.values())
        };
    });
}
