import { defineBuildConfig } from "@open-pioneer/build-support";

export default defineBuildConfig({
    entryPoints: ["index.js", "other-entry.js", "nested/index.js"]
});
