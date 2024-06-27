import { defineBuildConfig } from "@open-pioneer/build-support";

export default defineBuildConfig({
    entryPoints: ["index"],
    services: {
        someService: {
            provides: "whatever.Service"
        }
    },
    servicesModule: "my-services"
});
