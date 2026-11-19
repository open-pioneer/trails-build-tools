import { publicAssetsUrl, getPublicAssetUrl } from 'open-pioneer:assets';

const assetsUrl = publicAssetsUrl;
function createWorker() {
  return new Worker(getPublicAssetUrl("third-party-lib/worker.js"));
}
async function loadData() {
  const response = await fetch(getPublicAssetUrl("nested/data.json"));
  return await response.json();
}

export { assetsUrl, createWorker, loadData };
//# sourceMappingURL=index.js.map
