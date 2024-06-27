// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { InputModel } from "./InputModel";
import {
    NormalizedEntryPoint,
    normalizeEntryPoint,
    normalizeEntryPoints
} from "../utils/entryPoints";
import { join } from "node:path";
import { ValidationReporter } from "../utils/ValidationReporter";
import { BuildConfig } from "@open-pioneer/build-support";
import { PackageConfig, createPackageConfigFromBuildConfig } from "@open-pioneer/build-common";

export const SUPPORTED_TS_EXTENSIONS = [".ts", ".mts", ".tsx"];
export const SUPPORTED_JS_EXTENSIONS = [...SUPPORTED_TS_EXTENSIONS, ".js", ".mjs", ".jsx"];
export const SUPPORTED_CSS_EXTENSIONS = [".css", ".scss"];

export interface PackageModel {
    /** Destination directory, usually './dist'. */
    outputDirectory: string;

    /** Input configuration. */
    input: InputModel;

    /** Full name of the package, e.g. "foo" or "@scope/foo". */
    packageName: string;

    /** All JavaScript entry points. */
    jsEntryPoints: NormalizedEntryPoint[];

    /** JavaScript entry points, indexed by their module id (e.g. "index" or "foo/bar") */
    jsEntryPointsByModuleId: Map<string, NormalizedEntryPoint>;

    /**
     * The .js entry point to load services from.
     * Present if the package uses services.
     *
     * This is included in {@link jsEntryPoints}.
     */
    servicesEntryPoint: NormalizedEntryPoint | undefined;

    /**
     * The .css entry point.
     * Present if the package uses styles.
     *
     * This is *not* included in {@link jsEntryPoints}.
     */
    cssEntryPoint: NormalizedEntryPoint | undefined;

    /**
     * I18n files (if any), relative paths to the package root.
     */
    i18nFiles: Set<string>;

    /** Glob patterns for copying assets. */
    assetPatterns: string[];
}

export function createPackageModel(
    input: InputModel,
    outputDirectory: string,
    reporter: ValidationReporter
): PackageModel {
    const packageName = input.packageJson.name;
    if (typeof packageName !== "string" || !packageName) {
        throw new Error(`Package at ${input.packageDirectory} does not have a 'name'.`);
    }

    const pkgConfig = input.packageConfig;

    const { jsEntryPointsByModuleId, servicesEntryPoint } = getEntryPointsFromBuildConfig(
        input.packageDirectory,
        input.buildConfig,
        input.buildConfigPath,
        input.packageConfig,
        (...args) => reporter.report(...args)
    );

    const normalizedCssEntryPoint = pkgConfig.styles
        ? normalizeEntryPoint(pkgConfig.styles, SUPPORTED_CSS_EXTENSIONS)
        : undefined;

    const i18nFiles = new Set<string>();
    for (const language of input.packageConfig.languages) {
        // language is a locale name, e.g. "de", "en", or "de-DE"
        // TODO: Currently some code duplication with the i18n file loading in the vite plugin,
        // see loadPackageMetadata.ts
        const i18nPath = join("i18n", `${language}.yaml`);
        i18nFiles.add(i18nPath);
    }

    const assetPatterns = toArray(input.buildConfig.publishConfig?.assets ?? "assets/**");
    reporter.check();
    return {
        outputDirectory,
        input,
        packageName,
        jsEntryPoints: Array.from(jsEntryPointsByModuleId.values()),
        jsEntryPointsByModuleId,
        cssEntryPoint: normalizedCssEntryPoint,
        i18nFiles,
        assetPatterns,
        servicesEntryPoint
    };
}

/**
 * Gathers the entry points defined by the given package.
 * The build config must have been parsed already.
 *
 * If the normalized package config has not been created, it will be created on demand.
 *
 * The report callback can be used to emit warnings.
 */
export function getEntryPointsFromBuildConfig(
    packageDirectory: string,
    buildConfig: BuildConfig,
    buildConfigPath: string,
    packageConfig: PackageConfig | undefined,
    report: (...args: unknown[]) => void
) {
    let jsEntryPoints = buildConfig.entryPoints;
    if (!jsEntryPoints) {
        report(`${buildConfigPath} must define the 'entryPoints' property in order to be built.`);
        jsEntryPoints = [];
    }

    const jsEntryPointsByModuleId = new Map<string, NormalizedEntryPoint>();
    for (const configuredEp of normalizeEntryPoints(
        toArray(jsEntryPoints),
        SUPPORTED_JS_EXTENSIONS
    )) {
        const key = configuredEp.outputModuleId;
        if (jsEntryPointsByModuleId.has(key)) {
            report(`Entry point '${key}' is defined multiple times.`);
            continue;
        }
        jsEntryPointsByModuleId.set(key, configuredEp);
    }

    const pkgConfig = packageConfig ?? createPackageConfigFromBuildConfig(buildConfig);

    let servicesEntryPoint;
    if (pkgConfig.services.size) {
        if (pkgConfig.servicesModule) {
            servicesEntryPoint = normalizeEntryPoint(
                pkgConfig.servicesModule,
                SUPPORTED_JS_EXTENSIONS
            );
            jsEntryPointsByModuleId.set(servicesEntryPoint.outputModuleId, servicesEntryPoint);
        } else {
            report(`Package at ${packageDirectory} defines services but has no services module.`);
        }
    }
    return {
        jsEntryPointsByModuleId,
        servicesEntryPoint
    };
}

function toArray<T>(value: T | T[]): T[] {
    if (Array.isArray(value)) {
        return value;
    }
    return [value];
}
