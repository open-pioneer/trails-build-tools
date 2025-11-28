// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
module.exports = {
    hooks: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateConfig(config: any) {
            return {
                ...config,
                allowUnusedPatches: true,
                ignorePatchFailures: false,

                // Disables automatic linking of local packages. Use `workspace:` protocol instead.
                linkWorkspacePackages: false,
                strictPeerDependencies: true,

                // Prefer older packages.
                // https://pnpm.io/settings#resolutionmode
                resolutionMode: "time-based",

                // Only install new versions when they are have aged a bit.
                // https://pnpm.io/settings#minimumreleaseage
                minimumReleaseAge: 4320, // 3 days in minutes
                minimumReleaseAgeExclude: [
                    "@open-pioneer/*",
                    "@conterra/*",
                    ...(config?.minimumReleaseAgeExclude ?? [])
                ]
            };
        }
    }
};
