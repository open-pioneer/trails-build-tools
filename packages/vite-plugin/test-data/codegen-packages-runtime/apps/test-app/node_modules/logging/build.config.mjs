export default {
    services: {
        LogService: {
            provides: [
                {
                    name: "logging.LogService"
                }
            ]
        }
    },
    servicesModule: "./customServices",
    appRuntimeMetadataversion: "1.0.0"
};
