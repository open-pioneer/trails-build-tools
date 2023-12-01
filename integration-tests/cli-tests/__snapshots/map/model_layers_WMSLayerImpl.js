import { createLogger } from '@open-pioneer/core';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import { defer } from '../../util/defer.js';
import { AbstractLayer } from '../AbstractLayer.js';
import { AbstractLayerBase } from '../AbstractLayerBase.js';
import { SublayersCollectionImpl } from '../SublayersCollectionImpl.js';

const LOG = createLogger("map:WMSLayer");
class WMSLayerImpl extends AbstractLayer {
  #url;
  #sublayers;
  #deferredSublayerUpdate;
  #layer;
  #source;
  constructor(config) {
    const layer = new ImageLayer();
    super({
      ...config,
      olLayer: layer
    });
    const source = new ImageWMS({
      ...config.sourceOptions,
      url: config.url,
      params: {
        ...config.sourceOptions?.params
      }
    });
    this.#url = config.url;
    this.#source = source;
    this.#layer = layer;
    this.#sublayers = new SublayersCollectionImpl(constructSublayers(config.sublayers));
    this.#updateLayersParam();
  }
  get url() {
    return this.#url;
  }
  get sublayers() {
    return this.#sublayers;
  }
  __attach(map) {
    super.__attach(map);
    for (const sublayer of this.#sublayers.getSublayers()) {
      sublayer.__attach(map, this, this);
    }
  }
  /** Called by the sublayers when their visibility changed. */
  __updateSublayerVisibility() {
    if (this.#deferredSublayerUpdate?.reschedule()) {
      return;
    }
    this.#deferredSublayerUpdate = defer(() => {
      try {
        this.#updateLayersParam();
        this.#deferredSublayerUpdate = void 0;
      } catch (e) {
        LOG.error(`Failed to update sublayer visibility on WMS layer '${this.id}'.`, e);
      }
    });
  }
  /**
   * Gathers the visibility of _all_ sublayers and assembles the 'layers' WMS parameter.
   * The parameters are then applied to the WMS source.
   */
  #updateLayersParam() {
    const layers = this.#getVisibleLayerNames();
    this.#source.updateParams({
      "LAYERS": layers
    });
    const source = layers.length === 0 ? null : this.#source;
    if (this.#layer.getSource() !== source) {
      this.#layer.setSource(source);
    }
  }
  #getVisibleLayerNames() {
    const layers = [];
    const visitSublayer = (sublayer) => {
      if (!sublayer.visible) {
        return;
      }
      const nestedSublayers = sublayer.sublayers.__getRawSublayers();
      if (nestedSublayers.length) {
        for (const nestedSublayer of nestedSublayers) {
          visitSublayer(nestedSublayer);
        }
      } else {
        layers.push(sublayer.name);
      }
    };
    for (const sublayer of this.sublayers.__getRawSublayers()) {
      visitSublayer(sublayer);
    }
    return layers;
  }
}
class WMSSublayerImpl extends AbstractLayerBase {
  #parent;
  #parentLayer;
  #name;
  #sublayers;
  #visible;
  constructor(config) {
    super(config);
    this.#name = config.name;
    this.#visible = config.visible ?? true;
    this.#sublayers = new SublayersCollectionImpl(constructSublayers(config.sublayers));
  }
  get name() {
    return this.#name;
  }
  get sublayers() {
    return this.#sublayers;
  }
  get parent() {
    const parent = this.#parent;
    if (!parent) {
      throw new Error(`WMS sublayer ${this.id} has not been attached to its parent yet.`);
    }
    return parent;
  }
  get parentLayer() {
    const parentLayer = this.#parentLayer;
    if (!parentLayer) {
      throw new Error(`WMS sublayer ${this.id} has not been attached to its parent yet.`);
    }
    return parentLayer;
  }
  /**
   * Called by the parent layer when it is attached to the map to attach all sublayers.
   */
  __attach(map, parentLayer, parent) {
    super.__attachToMap(map);
    if (this.#parent) {
      throw new Error(
        `WMS sublayer '${this.id}' has already been attached to parent '${this.#parent.id}'`
      );
    }
    this.#parent = parent;
    if (this.#parentLayer) {
      throw new Error(
        `WMS sublayer '${this.id}' has already been attached to parent layer '${this.#parentLayer.id}'`
      );
    }
    this.#parentLayer = parentLayer;
    for (const sublayer of this.sublayers.__getRawSublayers()) {
      sublayer.__attach(map, parentLayer, this);
    }
  }
  get visible() {
    return this.#visible;
  }
  setVisible(newVisibility) {
    if (this.visible !== newVisibility) {
      this.#visible = newVisibility;
      this.#parentLayer?.__updateSublayerVisibility();
      this.__emitChangeEvent("changed:visible");
    }
  }
}
function constructSublayers(sublayerConfigs = []) {
  const sublayers = [];
  try {
    for (const sublayerConfig of sublayerConfigs) {
      sublayers.push(new WMSSublayerImpl(sublayerConfig));
    }
    return sublayers;
  } catch (e) {
    while (sublayers.length) {
      const layer = sublayers.pop();
      layer?.destroy();
    }
    throw new Error("Failed to construct sublayers.", { cause: e });
  }
}

export { WMSLayerImpl };
//# sourceMappingURL=WMSLayerImpl.js.map
