// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { generateAppMetadata as generateAppMetadataV1 } from "./generateAppMetadata";
import { generateAppMetadataV2 } from "./generateAppMetadata.v2";
import { RuntimeVersion } from "@open-pioneer/build-common";

export interface AppMetadataGenerator {
    generate(
        packageDirectory: string,
        metadataModuleId: string,
        runtimeVersion?: RuntimeVersion
    ): string;
}

class AppMetadataGeneratorV1 implements AppMetadataGenerator {
    generate(packageDirectory: string, metadataModuleId: string): string {
        return generateAppMetadataV1(packageDirectory, metadataModuleId);
    }
}

class AppMetadataGeneratorV2 implements AppMetadataGenerator {
    generate(
        packageDirectory: string,
        metadataModuleId: string,
        runtimeVersion: RuntimeVersion
    ): string {
        return generateAppMetadataV2(packageDirectory, metadataModuleId, runtimeVersion);
    }
}

export class AppMetadataGeneratorFactory {
    static createGenerator(runtimeVersion: RuntimeVersion): AppMetadataGenerator {
        switch (runtimeVersion) {
            case "1.0.0":
                return new AppMetadataGeneratorV1();
            case "2.0.0":
                return new AppMetadataGeneratorV2();
            default:
                return new AppMetadataGeneratorV1();
        }
    }

    static generate(
        runtimeVersion: RuntimeVersion,
        packageDirectory: string,
        metadataModuleId: string
    ): string {
        const generator = this.createGenerator(runtimeVersion);
        return generator.generate(packageDirectory, metadataModuleId, runtimeVersion);
    }
}
