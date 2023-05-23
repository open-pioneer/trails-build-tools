// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { InputModel } from "./InputModel";
import { NormalizedEntryPoint, normalizeEntryPoint, normalizeEntryPoints } from "./helpers";
import { SUPPORTED_JS_EXTENSIONS } from "./buildJs";
import { BuildConfig } from "@open-pioneer/build-common";
import { SUPPORTED_CSS_EXTENSIONS } from "./buildCss";

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
    for (const configuredEp of normalizeEntryPoints(jsEntryPoints, SUPPORTED_JS_EXTENSIONS)) {
        const key = configuredEp.outputModuleId;
        if (jsEntryPointsByModuleId.has(key)) {
            throw new Error(`Entry point '${key}' is defined multiple times.`);
        }
        jsEntryPointsByModuleId.set(key, configuredEp);
    }

    let servicesEntryPoint;
    if (hasServices(input.buildConfig)) {
        servicesEntryPoint = normalizeEntryPoint(
            input.buildConfig.servicesModule ?? "./services",
            SUPPORTED_JS_EXTENSIONS
        );
        jsEntryPointsByModuleId.set(servicesEntryPoint.outputModuleId, servicesEntryPoint);
    }

    const normalizedCssEntryPoint = input.buildConfig.styles
        ? normalizeEntryPoint(input.buildConfig.styles, SUPPORTED_CSS_EXTENSIONS)
        : undefined;

    const assetPattern = toArray(input.buildConfig.publishConfig?.assets ?? "assets/**");

    return {
        outputDirectory,
        input,
        packageName,
        jsEntryPoints: Array.from(jsEntryPointsByModuleId.values()),
        jsEntryPointsByModuleId,
        cssEntryPoint: normalizedCssEntryPoint,
        assetPatterns: assetPattern,
        servicesEntryPoint
    };
}

function hasServices(buildConfig: BuildConfig) {
    return buildConfig.services && Object.keys(buildConfig.services).length > 0;
}

function toArray<T>(value: T | T[]): T[] {
    if (Array.isArray(value)) {
        return value;
    }
    return [value];
}
