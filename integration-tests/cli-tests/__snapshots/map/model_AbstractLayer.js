import { createLogger } from '@open-pioneer/core';
import { unByKey } from 'ol/Observable.js';
import OlLayer from 'ol/layer/Layer.js';
import { AbstractLayerBase } from './AbstractLayerBase.js';

const LOG = createLogger("map:AbstractLayer");
class AbstractLayer extends AbstractLayerBase {
  #olLayer;
  #isBaseLayer;
  #healthCheck;
  #visible;
  #loadState;
  #stateWatchResource;
  constructor(config) {
    super(config);
    this.#olLayer = config.olLayer;
    this.#isBaseLayer = config.isBaseLayer ?? false;
    this.#healthCheck = config.healthCheck;
    this.#visible = config.visible ?? true;
    this.#loadState = getSourceState(getSource(this.#olLayer));
  }
  get visible() {
    return this.#visible;
  }
  get olLayer() {
    return this.#olLayer;
  }
  get isBaseLayer() {
    return this.#isBaseLayer;
  }
  get loadState() {
    return this.#loadState;
  }
  destroy() {
    if (this.__destroyed) {
      return;
    }
    this.#stateWatchResource?.destroy();
    this.olLayer.dispose();
    super.destroy();
  }
  /**
   * Called by the map model when the layer is added to the map.
   */
  __attach(map) {
    super.__attachToMap(map);
    const { initial: initialState, resource: stateWatchResource } = watchLoadState(
      this,
      this.#healthCheck,
      (state) => {
        this.#setLoadState(state);
      }
    );
    this.#stateWatchResource = stateWatchResource;
    this.#setLoadState(initialState);
  }
  setVisible(newVisibility) {
    if (this.isBaseLayer) {
      LOG.warn(
        `Cannot change visibility of base layer '${this.id}': use activateBaseLayer() on the map's LayerCollection instead.`
      );
      return;
    }
    this.__setVisible(newVisibility);
  }
  __setVisible(newVisibility) {
    let changed = false;
    if (this.#visible !== newVisibility) {
      this.#visible = newVisibility;
      changed = true;
    }
    if (this.#olLayer.getVisible() != this.#visible) {
      this.#olLayer.setVisible(newVisibility);
    }
    changed && this.__emitChangeEvent("changed:visible");
  }
  #setLoadState(loadState) {
    if (loadState !== this.#loadState) {
      this.#loadState = loadState;
      this.__emitChangeEvent("changed:loadState");
    }
  }
}
function watchLoadState(layer, healthCheck, onChange) {
  const olLayer = layer.olLayer;
  if (!(olLayer instanceof OlLayer)) {
    return {
      initial: "loaded",
      resource: {
        destroy() {
        }
      }
    };
  }
  let currentSource = getSource(olLayer);
  const currentOlLayerState = getSourceState(currentSource);
  let currentLoadState = currentOlLayerState;
  let currentHealthState = "loading";
  if (currentOlLayerState !== "error") {
    doHealthCheck(layer, healthCheck).then((state) => {
      currentHealthState = state;
      updateState();
    });
  }
  const updateState = () => {
    const olLayerState = getSourceState(currentSource);
    const nextLoadState = currentHealthState === "error" ? "error" : olLayerState;
    if (currentLoadState !== nextLoadState) {
      currentLoadState = nextLoadState;
      onChange(currentLoadState);
    }
  };
  let stateHandle;
  stateHandle = currentSource?.on("change", () => {
    updateState();
  });
  const sourceHandle = olLayer.on("change:source", () => {
    stateHandle && unByKey(stateHandle);
    stateHandle = void 0;
    currentSource = getSource(olLayer);
    stateHandle = currentSource?.on("change", () => {
      updateState();
    });
    updateState();
  });
  return {
    initial: currentLoadState,
    resource: {
      destroy() {
        stateHandle && unByKey(stateHandle);
        unByKey(sourceHandle);
      }
    }
  };
}
async function doHealthCheck(layer, healthCheck) {
  if (healthCheck == null) {
    return "loaded";
  }
  let healthCheckFn;
  if (typeof healthCheck === "function") {
    healthCheckFn = healthCheck;
  } else if (typeof healthCheck === "string") {
    healthCheckFn = async () => {
      const httpService = layer.map.__sharedDependencies.httpService;
      const response = await httpService.fetch(healthCheck);
      if (response.ok) {
        return "loaded";
      }
      LOG.warn(
        `Health check failed for layer '${layer.id}' (http status ${response.status})`
      );
      return "error";
    };
  } else {
    LOG.error(
      `Unexpected object for 'healthCheck' parameter of layer '${layer.id}'`,
      healthCheck
    );
    return "error";
  }
  try {
    return await healthCheckFn(layer);
  } catch (e) {
    LOG.warn(`Health check failed for layer '${layer.id}'`, e);
    return "error";
  }
}
function getSource(olLayer) {
  if (!(olLayer instanceof OlLayer)) {
    return void 0;
  }
  return olLayer?.getSource() ?? void 0;
}
function getSourceState(olSource) {
  const state = olSource?.getState();
  switch (state) {
    case void 0:
      return "loaded";
    case "undefined":
      return "not-loaded";
    case "loading":
      return "loading";
    case "ready":
      return "loaded";
    case "error":
      return "error";
  }
}

export { AbstractLayer };
//# sourceMappingURL=AbstractLayer.js.map
