// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { Logger } from "./Logger";
import { PackageModel } from "./PackageModel";
import posix from "node:path/posix";

type SimplePackageModel = Pick<
    PackageModel,
    "input" | "jsEntryPoints" | "servicesEntryPoint" | "cssEntryPoint"
>;

export interface GeneratePackageJsonOptions {
    model: SimplePackageModel;

    logger: Logger;

    /** Perform strict validation (throw instead of warn for problems). */
    strict: boolean;
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
    logger,
    strict
}: GeneratePackageJsonOptions): Promise<Record<string, unknown>> {
    const sourcePackageJson = model.input.packageJson;
    const sourcePackageJsonPath = model.input.packageJsonPath;
    const validationErrors = createValidationErrorReporter(
        logger,
        model.input.packageDirectory,
        strict
    );

    // Check source package.json
    validatePackageJson(sourcePackageJson, sourcePackageJsonPath, validationErrors);

    // Generate package.json for publishing
    const packageJson: Record<string, unknown> = {
        type: "module"
    };
    for (const field of COPY_FIELDS) {
        if (Object.hasOwn(sourcePackageJson, field)) {
            packageJson[field] = sourcePackageJson[field];
        }
    }
    packageJson.exports = generateExports(model, validationErrors);
    packageJson.openPioneerFramework = generateMetadata(model, validationErrors);

    // Throw if strict
    validationErrors.finish();

    // Clone (for safety) and also strip 'undefined' values.
    return JSON.parse(JSON.stringify(packageJson));
}

interface ValidationErrorReporter {
    // Reports a problem
    report(...args: unknown[]): void;

    // Throws if strict mode is enabled.
    finish(): void;
}

function validatePackageJson(
    sourcePackageJson: Record<string, unknown>,
    sourcePackageJsonPath: string,
    validationErrors: ValidationErrorReporter
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
    if (!sourcePackageJson.license) {
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

function generateExports(model: SimplePackageModel, validationErrors: ValidationErrorReporter) {
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
        addEntryPoint(exportedName, {
            import: `./${entryPoint.outputModuleId}.js`
            // TODO: types for typescript
        });
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

function generateMetadata(
    model: SimplePackageModel,
    _validationErrors: ValidationErrorReporter
): Record<string, unknown> {
    // TODO: Typings!
    const buildConfig = model.input.buildConfig;
    const metadata: Record<string, unknown> = {
        packageFormatVersion: "0.1",
        styles: model.cssEntryPoint ? `./${model.cssEntryPoint.outputModuleId}.css` : undefined,
        servicesModules: model.servicesEntryPoint?.outputModuleId
            ? `./${model.servicesEntryPoint.outputModuleId}`
            : undefined,

        // TODO: These will have to be normalized in some way to keep it simple
        i18n: buildConfig.i18n, // TODO: Copy not implemented yet #81
        services: buildConfig.services,
        ui: buildConfig.ui,
        properties: buildConfig.properties,
        propertiesMeta: buildConfig.propertiesMeta
    };
    return metadata;
}

function createValidationErrorReporter(
    logger: Logger,
    path: string,
    strict: boolean
): ValidationErrorReporter {
    let hasValidationError = false;
    return {
        report(...args) {
            (strict ? logger.error : logger.warn)(...args);
            hasValidationError = true;
        },
        finish() {
            if (strict && hasValidationError) {
                throw new Error(
                    `Aborting due to previous validation errors in ${path} (strict validation is enabled).`
                );
            }
        }
    };
}
