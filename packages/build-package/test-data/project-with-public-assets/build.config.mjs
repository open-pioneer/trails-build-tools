import { defineBuildConfig } from "@open-pioneer/build-support";

export default defineBuildConfig({
    entryPoints: ["index"],
    publicAssets: [
        { src: "public", dest: "." },
        { src: "./node_modules/third-party-lib/cdn", dest: "third-party-lib" }
    ]
});
