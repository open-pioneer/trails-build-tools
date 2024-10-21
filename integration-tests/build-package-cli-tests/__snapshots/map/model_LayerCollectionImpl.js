import { createLogger, EventEmitter } from '@open-pioneer/core';
import { AbstractLayer } from './AbstractLayer.js';

const LOG = createLogger("map:LayerCollection");
const BASE_LAYER_Z = 0;
const OPERATION_LAYER_INITIAL_Z = 1;
const TOPMOST_LAYER_Z = 9999999;
class LayerCollectionImpl extends EventEmitter {
  #map;
  /** Top level layers (base layers, operational layers). No sublayers. */
  #topLevelLayers = /* @__PURE__ */ new Set();
  /** Index of _all_ layer instances, including sublayers. */
  #layersById = /* @__PURE__ */ new Map();
  /** Reverse index of _all_ layers that have an associated OpenLayers layer. */
  #layersByOlLayer = /* @__PURE__ */ new WeakMap();
  /** Currently active base layer. */
  #activeBaseLayer;
  /** next z-index for operational layer. currently just auto-increments. */
  #nextIndex = OPERATION_LAYER_INITIAL_Z;
  constructor(map) {
    super();
    this.#map = map;
  }
  destroy() {
    for (const layer of this.#layersById.values()) {
      layer.destroy();
    }
    this.#topLevelLayers.clear();
    this.#layersById.clear();
    this.#activeBaseLayer = void 0;
  }
  addLayer(layer) {
    if (!isLayerInstance(layer)) {
      throw new Error(
        `Layer is not a valid layer instance. Use one of the classes provided by the map package instead.`
      );
    }
    layer.__attach(this.#map);
    this.#addLayer(layer);
  }
  getBaseLayers() {
    return this.getAllLayers().filter((layer) => layer.isBaseLayer);
  }
  getActiveBaseLayer() {
    return this.#activeBaseLayer;
  }
  activateBaseLayer(id) {
    let newBaseLayer = void 0;
    if (id != null) {
      newBaseLayer = this.#layersById.get(id);
      if (!(newBaseLayer instanceof AbstractLayer)) {
        LOG.warn(`Cannot activate base layer '${id}: layer has an invalid type.'`);
        return false;
      }
      if (!newBaseLayer) {
        LOG.warn(`Cannot activate base layer '${id}': layer is unknown.`);
        return false;
      }
      if (!newBaseLayer.isBaseLayer) {
        LOG.warn(`Cannot activate base layer '${id}': layer is not a base layer.`);
        return false;
      }
    }
    if (newBaseLayer !== this.#activeBaseLayer) {
      this.#updateBaseLayer(newBaseLayer);
      this.emit("changed");
    }
    return true;
  }
  getOperationalLayers(options) {
    return this.getAllLayers(options).filter((layer) => !layer.isBaseLayer);
  }
  getAllLayers(options) {
    const layers = Array.from(this.#topLevelLayers.values());
    if (options?.sortByDisplayOrder) {
      sortLayersByDisplayOrder(layers);
    }
    return layers;
  }
  getLayerById(id) {
    return this.#layersById.get(id);
  }
  removeLayerById(id) {
    const model = this.#layersById.get(id);
    if (!model) {
      LOG.isDebug() && LOG.debug(`Cannot remove layer '${id}': layer is unknown.`);
      return;
    }
    this.#removeLayer(model);
  }
  getLayerByRawInstance(layer) {
    return this.#layersByOlLayer?.get(layer);
  }
  /**
   * Adds the given layer to the map and all relevant indices.
   */
  #addLayer(model) {
    this.#indexLayer(model);
    const olLayer = model.olLayer;
    if (model.isBaseLayer) {
      olLayer.setZIndex(BASE_LAYER_Z);
      if (!this.#activeBaseLayer && model.visible) {
        this.#updateBaseLayer(model);
      } else {
        model.__setVisible(false);
      }
    } else {
      olLayer.setZIndex(this.#nextIndex++);
      model.__setVisible(model.visible);
    }
    this.#topLevelLayers.add(model);
    this.#map.olMap.addLayer(olLayer);
    this.emit("changed");
  }
  /**
   * Removes the given layer from the map and all relevant indices.
   * The layer will be destroyed.
   */
  #removeLayer(model) {
    if (!this.#topLevelLayers.has(model)) {
      LOG.warn(
        `Cannot remove layer '${model.id}': only top level layers can be removed at this time.`
      );
      return;
    }
    if (!(model instanceof AbstractLayer)) {
      throw new Error(
        `Internal error: expected top level layer to be an instance of AbstractLayer.`
      );
    }
    this.#map.olMap.removeLayer(model.olLayer);
    this.#topLevelLayers.delete(model);
    this.#unIndexLayer(model);
    if (this.#activeBaseLayer === model) {
      this.#updateBaseLayer(this.getBaseLayers()[0]);
    }
    model.destroy();
    this.emit("changed");
  }
  #updateBaseLayer(model) {
    if (this.#activeBaseLayer === model) {
      return;
    }
    if (LOG.isDebug()) {
      const getId = (model2) => {
        return model2 ? `'${model2.id}'` : void 0;
      };
      LOG.debug(
        `Switching active base layer from ${getId(this.#activeBaseLayer)} to ${getId(
          model
        )}`
      );
    }
    this.#activeBaseLayer?.__setVisible(false);
    this.#activeBaseLayer = model;
    this.#activeBaseLayer?.__setVisible(true);
  }
  /**
   * Index the layer and all its children.
   */
  #indexLayer(model) {
    const registrations = [];
    const visit = (model2) => {
      const id = model2.id;
      const olLayer = "olLayer" in model2 ? model2.olLayer : void 0;
      if (this.#layersById.has(id)) {
        throw new Error(
          `Layer id '${id}' is not unique. Either assign a unique id yourself or skip configuring 'id' for an automatically generated id.`
        );
      }
      if (olLayer && this.#layersByOlLayer.has(olLayer)) {
        throw new Error(`OlLayer has already been used in this or another layer.`);
      }
      this.#layersById.set(id, model2);
      if (olLayer) {
        this.#layersByOlLayer.set(olLayer, model2);
      }
      registrations.push([id, olLayer]);
      for (const sublayer of model2.sublayers?.__getRawSublayers() ?? []) {
        visit(sublayer);
      }
    };
    try {
      visit(model);
    } catch (e) {
      for (const [id, olLayer] of registrations) {
        this.#layersById.delete(id);
        if (olLayer) {
          this.#layersByOlLayer.delete(olLayer);
        }
      }
      throw e;
    }
  }
  /**
   * Removes index entries for the given layer and all its sublayers.
   */
  #unIndexLayer(model) {
    const visit = (model2) => {
      if ("olLayer" in model2) {
        this.#layersByOlLayer.delete(model2.olLayer);
      }
      this.#layersById.delete(model2.id);
      for (const sublayer of model2.sublayers?.__getRawSublayers() ?? []) {
        visit(sublayer);
      }
    };
    visit(model);
  }
}
function sortLayersByDisplayOrder(layers) {
  layers.sort((left, right) => {
    const leftZ = left.olLayer.getZIndex() ?? 1;
    const rightZ = right.olLayer.getZIndex() ?? 1;
    if (leftZ !== rightZ) {
      return leftZ - rightZ;
    }
    return left.id.localeCompare(right.id, "en");
  });
}
function isLayerInstance(object) {
  return object instanceof AbstractLayer;
}

export { LayerCollectionImpl, TOPMOST_LAYER_Z };
//# sourceMappingURL=LayerCollectionImpl.js.map
