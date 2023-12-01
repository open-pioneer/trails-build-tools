import { createLogger } from '@open-pioneer/core';
import { unByKey } from 'ol/Observable';
import OlLayer from 'ol/layer/Layer';
import { AbstractLayerBase } from './AbstractLayerBase.js';

const LOG = createLogger("map:AbstractLayer");
class AbstractLayer extends AbstractLayerBase {
  #olLayer;
  #isBaseLayer;
  #visible;
  #loadState;
  #stateWatchResource;
  constructor(config) {
    super(config);
    this.#olLayer = config.olLayer;
    this.#isBaseLayer = config.isBaseLayer ?? false;
    this.#visible = config.visible ?? true;
    const { initial: initialState, resource: stateWatchResource } = watchLoadState(
      this.#olLayer,
      (state) => {
        this.#loadState = state;
        this.__emitChangeEvent("changed:loadState");
      }
    );
    this.#loadState = initialState;
    this.#stateWatchResource = stateWatchResource;
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
}
function watchLoadState(olLayer, onChange) {
  if (!(olLayer instanceof OlLayer)) {
    return {
      initial: "loaded",
      resource: {
        destroy() {
        }
      }
    };
  }
  let currentSource = olLayer?.getSource();
  let currentLoadState = mapState(currentSource?.getState());
  const updateState = () => {
    const nextLoadState = mapState(currentSource?.getState());
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
    currentSource = olLayer?.getSource();
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
function mapState(state) {
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
