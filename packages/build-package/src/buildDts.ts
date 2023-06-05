// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type * as Ts from "typescript";
import { Logger } from "./utils/Logger";
import { NormalizedEntryPoint } from "./utils/entryPoints";
import glob from "fast-glob";
import { SUPPORTED_TS_EXTENSIONS } from "./model/PackageModel";

type TsModule = typeof Ts;

export interface BuildDtsOptions {
    /** Package source directory. */
    packageDirectory: string;

    /** JavaScript/TypeScript entry points. */
    entryPoints: NormalizedEntryPoint[];

    /** Destination directory. */
    outputDirectory: string;

    strict: boolean;
    logger: Logger;
}

/**
 * Generates `.d.ts` files for `entryPoints` and all TypeScript files
 * referenced by them.
 */
export async function buildDts({
    packageDirectory,
    outputDirectory,
    entryPoints,
    strict,
    logger
}: BuildDtsOptions) {
    const ts = await getTypeScriptAPI();
    const { fileNames, options, errors } = getTypeScriptConfig(
        ts,
        packageDirectory,
        outputDirectory,
        entryPoints,
        logger
    );

    // We're currently allowing the compiler to write the .d.ts files directly.
    // We can also write them into memory and post process them in the future:
    // https://github.com/microsoft/TypeScript-wiki/blob/main/Using-the-Compiler-API.md#getting-the-dts-from-a-javascript-file
    const host = ts.createCompilerHost(options);
    const program = ts.createProgram({
        rootNames: fileNames,
        options,
        host,
        configFileParsingDiagnostics: errors
    });

    program.emit();

    const diagnostics = ts.getPreEmitDiagnostics(program);
    for (const error of diagnostics) {
        outputDiagnostic(ts, error, logger);
    }
    if (strict && diagnostics.length > 0) {
        throw new Error(`Aborting due to compilation errors (strict validation is enabled).`);
    }
}

/**
 * Returns either `force` (if set to a boolean value), or `true` if the directory
 * contains TypeScript source files, or `false` otherwise.
 */
export async function shouldGenerateTypes(packageDirectory: string, force?: boolean) {
    if (force != null) {
        return force;
    }

    const files = await glob(`./**/*{${SUPPORTED_TS_EXTENSIONS.join(",")}}`, {
        onlyFiles: true,
        cwd: packageDirectory,
        followSymbolicLinks: false,
        dot: false,
        ignore: ["**/node_modules/**"]
    });
    return files.length > 0;
}

function getTypeScriptConfig(
    ts: TsModule,
    packageDirectory: string,
    outputDirectory: string,
    entryPoints: NormalizedEntryPoint[],
    logger: Logger
) {
    const tsConfigPath = getTsConfigPath(packageDirectory);

    let fileNames = entryPoints.map((e) => resolve(packageDirectory, e.inputModulePath));
    let options: Ts.CompilerOptions = {};
    let errors: Ts.Diagnostic[] = [];
    if (existsSync(tsConfigPath)) {
        const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
        if (configFile.error) {
            outputDiagnostic(ts, configFile.error, logger);
            throw new Error("Failed to read TypeScript configuration file.");
        }

        const {
            fileNames: configFileNames,
            options: configOptions,
            errors: configErrors
        } = ts.parseJsonConfigFileContent(
            configFile.config,
            ts.sys,
            packageDirectory,
            undefined,
            tsConfigPath
        );

        options = configOptions;
        errors = configErrors;
        if (configFileNames.length) {
            fileNames = configFileNames;
        } else {
            fileNames = entryPoints.map((e) => resolve(packageDirectory, e.inputModulePath));
        }
    }

    // Enforce some required options
    options.noEmit = false;
    options.declaration = true;
    options.emitDeclarationOnly = true;
    options.skipLibCheck = true;
    options.noEmitOnError = false;
    options.declarationDir = outputDirectory;

    // Defaults
    options.allowJs ??= true;
    options.strict ??= true;
    options.target ??= ts.ScriptTarget.ES2022;
    options.module ??= ts.ModuleKind.ES2022;
    options.moduleResolution ??= ts.ModuleResolutionKind.Bundler;
    options.jsx ??= ts.JsxEmit.ReactJSX;
    options.esModuleInterop = true;
    options.allowSyntheticDefaultImports = true;
    options.isolatedModules = true;

    return { fileNames, options, errors };
}

function getTsConfigPath(packageDirectory: string) {
    return resolve(packageDirectory, "tsconfig.json");
}

// https://github.com/microsoft/TypeScript-wiki/blob/main/Using-the-Compiler-API.md#a-minimal-compiler
function outputDiagnostic(ts: TsModule, diagnostic: Ts.Diagnostic, logger: Logger) {
    if (diagnostic.file) {
        const { line, character } = ts.getLineAndCharacterOfPosition(
            diagnostic.file,
            diagnostic.start ?? 0
        );
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        logger.error(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
        logger.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    }
}

async function getTypeScriptAPI(): Promise<TsModule> {
    let ts: TsModule;
    try {
        ts = (await import("typescript")).default;
        if (!ts) {
            throw new Error("Default export not found.");
        }
    } catch (e) {
        throw new Error(
            `The package 'typescript' must be installed to enable TypeScript support.`,
            {
                cause: e
            }
        );
    }
    return ts;
}
