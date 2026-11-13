import { getPublicAssetUrl, publicAssetsUrl } from "open-pioneer:assets";

console.log("scoped-assets", publicAssetsUrl, getPublicAssetUrl("scoped.txt"));
