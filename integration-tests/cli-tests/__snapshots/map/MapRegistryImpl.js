import { createLogger } from '@open-pioneer/core';
import { createMapModel } from './model/createMapModel.js';

const LOG = createLogger("map:MapRegistry");
class MapRegistryImpl {
  #configProviders = /* @__PURE__ */ new Map();
  #entries = /* @__PURE__ */ new Map();
  #modelCreationJobs = /* @__PURE__ */ new Map();
  #modelsByOlMap = /* @__PURE__ */ new WeakMap();
  #destroyed = false;
  constructor(options) {
    const providers = options.references.providers;
    for (const provider of providers) {
      this.#configProviders.set(provider.mapId, provider);
    }
  }
  destroy() {
    if (this.#destroyed) {
      return;
    }
    LOG.info(`Destroy map registry and all maps`);
    this.#destroyed = true;
    this.#entries.forEach((model) => {
      model.kind === "model" && model.model.destroy();
    });
    this.#entries.clear();
    this.#modelCreationJobs.clear();
  }
  async getMapModel(mapId) {
    if (this.#destroyed) {
      throw new Error("MapRegistry has already been destroyed.");
    }
    const creationJob = this.#modelCreationJobs.get(mapId);
    if (creationJob) {
      return unbox(await creationJob);
    }
    const entry = this.#entries.get(mapId);
    if (entry) {
      return unbox(entry);
    }
    const provider = this.#configProviders.get(mapId);
    if (!provider) {
      LOG.debug(`Failed to find a config provider for map id '${mapId}'.`);
      return void 0;
    }
    const modelPromise = this.#createModel(mapId, provider).catch((cause) => {
      const error = new Error(`Failed to construct map '${mapId}'`, { cause });
      const entry2 = { kind: "error", error };
      this.#modelCreationJobs.delete(mapId);
      this.#entries.set(mapId, entry2);
      return entry2;
    });
    this.#modelCreationJobs.set(mapId, modelPromise);
    return unbox(await modelPromise);
  }
  async expectMapModel(mapId) {
    const model = await this.getMapModel(mapId);
    if (!model) {
      throw new Error(`No configuration available for map with id '${mapId}'.`);
    }
    return model;
  }
  getMapModelByRawInstance(olMap) {
    return this.#modelsByOlMap.get(olMap);
  }
  async #createModel(mapId, provider) {
    LOG.info(`Creating map with id '${mapId}'`);
    const mapConfig = await provider.getMapConfig();
    const mapModel = await createMapModel(mapId, mapConfig);
    if (this.#destroyed) {
      mapModel.destroy();
      throw new Error(`MapRegistry has been destroyed.`);
    }
    const entry = { kind: "model", model: mapModel };
    this.#entries.set(mapId, entry);
    this.#modelCreationJobs.delete(mapId);
    this.#modelsByOlMap.set(mapModel.olMap, mapModel);
    return entry;
  }
}
function unbox(entry) {
  if (entry.kind === "error") {
    throw entry.error;
  }
  return entry.model;
}

export { MapRegistryImpl };
//# sourceMappingURL=MapRegistryImpl.js.map
