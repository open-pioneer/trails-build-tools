// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { resolve } from "node:path";
import type * as Ts from "typescript";
import { Logger } from "./utils/Logger";
import { NormalizedEntryPoint } from "./utils/entryPoints";
import glob from "fast-glob";
import { SUPPORTED_TS_EXTENSIONS } from "./model/PackageModel";
import { createDebugger } from "./utils/debug";
import { existsSync } from "node:fs";

const isDebug = !!process.env.DEBUG;
const debug = createDebugger("open-pioneer:buildDts");

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
    const { fileNames, options, errors } = createTypeScriptConfig(
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

    isDebug && debug("Using compiler options %O", options);
    program.emit();

    const diagnostics = ts.getPreEmitDiagnostics(program);
    let hasError = false;
    for (const error of diagnostics) {
        outputDiagnostic(ts, error, logger);
        if (error.category === ts.DiagnosticCategory.Error) {
            hasError = true;
        }
    }
    if (strict && hasError) {
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

function createTypeScriptConfig(
    ts: TsModule,
    packageDirectory: string,
    outputDirectory: string,
    entryPoints: NormalizedEntryPoint[],
    logger: Logger
) {
    const tsConfigPath = ts.findConfigFile(packageDirectory, ts.sys.fileExists, "tsconfig.json");
    isDebug && debug(`Using tsconfig %s`, tsConfigPath);

    const defaultCompilerOptions = {
        allowJs: true,
        target: "ES2022",
        module: "ES2022",
        moduleResolution: "bundler",
        jsx: "react-jsx",

        strict: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        isolatedModules: true
    };

    const fileNames = entryPoints.map((e) => resolve(packageDirectory, e.inputModulePath));
    let options: Ts.CompilerOptions = {};
    let errors: Ts.Diagnostic[] = [];
    if (tsConfigPath && existsSync(tsConfigPath)) {
        const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
        if (configFile.error) {
            outputDiagnostic(ts, configFile.error, logger);
            throw new Error("Failed to read TypeScript configuration file.");
        }

        // Apply default compiler options for convenience
        const rootConfig = (configFile.config ??= {});
        rootConfig.compilerOptions = {
            ...defaultCompilerOptions,
            ...rootConfig.compilerOptions
        };

        const {
            fileNames: configFileNames,
            options: configOptions,
            errors: configErrors
        } = ts.parseJsonConfigFileContent(
            configFile.config,
            ts.sys,
            packageDirectory,
            {},
            tsConfigPath
        );

        // Also read all referenced .d.ts files
        for (const fileName of configFileNames) {
            if (/\.d\.ts$/.test(fileName)) {
                fileNames.push(fileName);
            }
        }

        options = configOptions;
        errors = configErrors;
    } else {
        // Only use default compiler options
        const { options: configOptions, errors: configErrors } = ts.convertCompilerOptionsFromJson(
            defaultCompilerOptions,
            packageDirectory,
            undefined
        );

        options = configOptions;
        errors = configErrors;
    }

    const requiredValues: Partial<Ts.CompilerOptions> = {
        rootDir: packageDirectory,
        noEmit: false,
        declaration: true,
        declarationMap: false,
        emitDeclarationOnly: true,
        skipLibCheck: true,
        noEmitOnError: false,
        declarationDir: outputDirectory,

        // Disable type checks. We expect that those are done by the main build
        // and not during the compilation of individual packages.
        noCheck: true
    };

    options = {
        ...options,
        ...requiredValues
    };

    return { fileNames, options, errors };
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
