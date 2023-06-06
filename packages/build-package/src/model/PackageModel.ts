// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { InputModel } from "./InputModel";
import {
    NormalizedEntryPoint,
    normalizeEntryPoint,
    normalizeEntryPoints
} from "../utils/entryPoints";
import { join } from "node:path";

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

export function createPackageModel(input: InputModel, outputDirectory: string): PackageModel {
    const packageName = input.packageJson.name;
    if (typeof packageName !== "string" || !packageName) {
        throw new Error(`Package at ${input.packageDirectory} does not have a 'name'.`);
    }

    const jsEntryPoints = input.buildConfig.entryPoints;
    if (!jsEntryPoints) {
        throw new Error(
            `${input.buildConfigPath} must define the 'entryPoints' property in order to be built.`
        );
    }

    const jsEntryPointsByModuleId = new Map<string, NormalizedEntryPoint>();
    for (const configuredEp of normalizeEntryPoints(
        toArray(jsEntryPoints),
        SUPPORTED_JS_EXTENSIONS
    )) {
        const key = configuredEp.outputModuleId;
        if (jsEntryPointsByModuleId.has(key)) {
            throw new Error(`Entry point '${key}' is defined multiple times.`);
        }
        jsEntryPointsByModuleId.set(key, configuredEp);
    }

    const pkgConfig = input.packageConfig;

    let servicesEntryPoint;
    if (pkgConfig.services.size) {
        if (!pkgConfig.servicesModule) {
            throw new Error(
                `Package at ${input.packageDirectory} defines services but has no services module.`
            );
        }

        servicesEntryPoint = normalizeEntryPoint(pkgConfig.servicesModule, SUPPORTED_JS_EXTENSIONS);
        jsEntryPointsByModuleId.set(servicesEntryPoint.outputModuleId, servicesEntryPoint);
    }

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

function toArray<T>(value: T | T[]): T[] {
    if (Array.isArray(value)) {
        return value;
    }
    return [value];
}
