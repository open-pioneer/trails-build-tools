import { defineBuildConfig } from "@open-pioneer/build-support";

export default defineBuildConfig({
    entryPoints: ["entryPointA.js", "entryPointB.js"],
    styles: "my-styles.css",
    publishConfig: {
        types: true
    }
});
