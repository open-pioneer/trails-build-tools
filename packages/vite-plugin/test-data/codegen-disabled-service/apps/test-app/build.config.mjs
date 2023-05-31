import { defineBuildConfig } from "@open-pioneer/build-support";

export default defineBuildConfig({
    overrides: {
        "test-package": {
            services: {
                "B": {
                    enabled: false
                }
            },
        }
    },
});
