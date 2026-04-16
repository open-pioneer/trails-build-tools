import { defineBuildConfig } from "@open-pioneer/build-support";

export default defineBuildConfig({
    entryPoints: ["index.js"],
    publishConfig: {
        strict: false,
        validation: false,
        packageFormatTarget: "1.1",
    }
});
