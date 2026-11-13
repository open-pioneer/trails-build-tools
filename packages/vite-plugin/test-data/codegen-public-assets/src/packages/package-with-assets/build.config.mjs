export default {
    publicAssets: [
        { src: "public", dest: "." },
        { src: "./node_modules/third-party-lib/cdn", dest: "third-party-lib" },
        { src: "../shared-assets", dest: "shared/nested" }
    ]
};
