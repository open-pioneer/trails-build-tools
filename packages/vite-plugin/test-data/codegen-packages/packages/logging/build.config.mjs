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
    servicesModule: "./customServices"
};
