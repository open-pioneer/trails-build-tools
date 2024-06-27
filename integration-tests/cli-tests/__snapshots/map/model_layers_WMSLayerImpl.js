import { createLogger, isAbortError } from '@open-pioneer/core';
import WMSCapabilities from 'ol/format/WMSCapabilities';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import { fetchCapabilities } from '../../util/capabilities-utils.js';
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #capabilities;
  #abortController = new AbortController();
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
      },
      // Use http service to load tiles; needed for authentication etc.
      imageLoadFunction: (wrapper, url) => {
        return this.#loadImage(wrapper, url).catch((error) => {
          LOG.error(`Failed to load tile at '${url}'`, error);
        });
      }
    });
    this.#url = config.url;
    this.#source = source;
    this.#layer = layer;
    this.#sublayers = new SublayersCollectionImpl(constructSublayers(config.sublayers));
    this.#updateLayersParam();
  }
  get legend() {
    return void 0;
  }
  get url() {
    return this.#url;
  }
  get __source() {
    return this.#source;
  }
  get sublayers() {
    return this.#sublayers;
  }
  get capabilities() {
    return this.#capabilities;
  }
  __attach(map) {
    super.__attach(map);
    for (const sublayer of this.#sublayers.getSublayers()) {
      sublayer.__attach(map, this, this);
    }
    const layers = [];
    const getNestedSublayer = (sublayers, layers2) => {
      for (const sublayer of sublayers) {
        const nested = sublayer.sublayers.getSublayers();
        if (nested.length) {
          getNestedSublayer(nested, layers2);
        } else {
          if (sublayer.name) {
            layers2.push(sublayer);
          }
        }
      }
    };
    this.#fetchWMSCapabilities().then((result) => {
      const parser = new WMSCapabilities();
      const capabilities = parser.read(result);
      this.#capabilities = capabilities;
      getNestedSublayer(this.#sublayers.getSublayers(), layers);
      for (const layer of layers) {
        const legendUrl = getWMSLegendUrl(capabilities, layer.name);
        layer.legend = legendUrl;
      }
    }).catch((error) => {
      if (isAbortError(error)) {
        LOG.error(`Layer ${this.id} has been destroyed before fetching the data`);
        return;
      }
      LOG.error(`Failed fetching WMS capabilities for Layer ${this.id}`, error);
    });
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
        if (sublayer.name) {
          layers.push(sublayer.name);
        }
      }
    };
    for (const sublayer of this.sublayers.__getRawSublayers()) {
      visitSublayer(sublayer);
    }
    return layers;
  }
  async #fetchWMSCapabilities() {
    const httpService = this.map.__sharedDependencies.httpService;
    const url = `${this.#url}?LANGUAGE=ger&SERVICE=WMS&REQUEST=GetCapabilities`;
    return fetchCapabilities(url, httpService, this.#abortController.signal);
  }
  async #loadImage(imageWrapper, imageUrl) {
    const httpService = this.map.__sharedDependencies.httpService;
    const image = imageWrapper.getImage();
    const response = await httpService.fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const finish = () => {
      URL.revokeObjectURL(objectUrl);
      image.removeEventListener("load", finish);
      image.removeEventListener("error", finish);
    };
    image.addEventListener("load", finish);
    image.addEventListener("error", finish);
    image.src = objectUrl;
  }
}
class WMSSublayerImpl extends AbstractLayerBase {
  #parent;
  #parentLayer;
  #name;
  #legend;
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
  get legend() {
    return this.#legend;
  }
  set legend(legendUrl) {
    this.#legend = legendUrl;
    this.__emitChangeEvent("changed:legend");
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
function getWMSLegendUrl(capabilities, layerName) {
  const capabilitiesContent = capabilities?.Capability;
  const rootLayerCapabilities = capabilitiesContent?.Layer;
  let url = void 0;
  const searchNestedLayer = (layer) => {
    for (const currentLayer of layer) {
      if (currentLayer?.Name === layerName) {
        const activeLayer = currentLayer;
        const styles = activeLayer.Style;
        if (!styles || !styles.length) {
          LOG.debug("No style in WMS layer capabilities - giving up.");
          return;
        }
        const activeStyle = styles[0];
        url = activeStyle.LegendURL?.[0]?.OnlineResource;
      } else if (currentLayer.Layer) {
        searchNestedLayer(currentLayer.Layer);
      }
    }
  };
  if (rootLayerCapabilities) {
    searchNestedLayer(rootLayerCapabilities.Layer);
  }
  return url;
}

export { WMSLayerImpl, getWMSLegendUrl };
//# sourceMappingURL=WMSLayerImpl.js.map
