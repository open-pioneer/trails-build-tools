import { createLogger, isAbortError } from '@open-pioneer/core';
import TileState from 'ol/TileState.js';
import WMTSCapabilities from 'ol/format/WMTSCapabilities.js';
import TileLayer from 'ol/layer/Tile.js';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS.js';
import { fetchCapabilities } from '../../util/capabilities-utils.js';
import { AbstractLayer } from '../AbstractLayer.js';
import { ImageTile } from 'ol';

const LOG = createLogger("map:WMTSLayer");
class WMTSLayerImpl extends AbstractLayer {
  #url;
  #name;
  #matrixSet;
  #layer;
  #source;
  #legend;
  #sourceOptions;
  #abortController = new AbortController();
  constructor(config) {
    const layer = new TileLayer();
    super({
      ...config,
      olLayer: layer
    });
    this.#url = config.url;
    this.#name = config.name;
    this.#layer = layer;
    this.#matrixSet = config.matrixSet;
    this.#sourceOptions = config.sourceOptions;
  }
  destroy() {
    super.destroy();
    this.#abortController.abort();
  }
  get legend() {
    return this.#legend;
  }
  __attach(map) {
    super.__attach(map);
    this.#fetchWMTSCapabilities().then((result) => {
      const parser = new WMTSCapabilities();
      const capabilities = parser.read(result);
      const options = optionsFromCapabilities(capabilities, {
        layer: this.#name,
        matrixSet: this.#matrixSet
      });
      if (!options) {
        throw new Error("Layer was not found in capabilities");
      }
      const source = new WMTS({
        ...options,
        ...this.#sourceOptions,
        tileLoadFunction: (tile, tileUrl) => {
          this.#loadTile(tile, tileUrl);
        }
      });
      this.#source = source;
      this.#layer.setSource(this.#source);
      const activeStyleId = source.getStyle();
      const legendUrl = getWMTSLegendUrl(capabilities, this.name, activeStyleId);
      this.#legend = legendUrl;
      this.__emitChangeEvent("changed:legend");
    }).catch((error) => {
      if (isAbortError(error)) {
        LOG.error(`Layer ${this.name} has been destroyed before fetching the data`);
        return;
      }
      LOG.error(`Failed fetching WMTS capabilities for Layer ${this.name}`, error);
    });
  }
  get layer() {
    return this.#layer;
  }
  get url() {
    return this.#url;
  }
  get name() {
    return this.#name;
  }
  get matrixSet() {
    return this.#matrixSet;
  }
  get sublayers() {
    return void 0;
  }
  async #fetchWMTSCapabilities() {
    const httpService = this.map.__sharedDependencies.httpService;
    return fetchCapabilities(this.#url, httpService, this.#abortController.signal);
  }
  async #loadTile(tile, tileUrl) {
    const httpService = this.map.__sharedDependencies.httpService;
    try {
      if (!(tile instanceof ImageTile)) {
        throw new Error("Only 'ImageTile' is supported for now.");
      }
      const image = tile.getImage();
      if (!isHtmlImage(image)) {
        throw new Error("Only <img> tags are supported as tiles for now.");
      }
      const response = await httpService.fetch(tileUrl);
      if (!response.ok) {
        throw new Error(`Tile request failed with status ${response.status}.`);
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
    } catch (e) {
      tile.setState(TileState.ERROR);
      if (!isAbortError(e)) {
        LOG.error("Failed to load tile", e);
      }
    }
  }
}
function isHtmlImage(htmlElement) {
  return htmlElement.tagName === "IMG";
}
function getWMTSLegendUrl(capabilities, activeLayerId, activeStyleId) {
  const content = capabilities?.Contents;
  const layers = content?.Layer;
  let activeLayer = layers?.find((layer) => layer?.Identifier === activeLayerId);
  if (!activeLayer) {
    LOG.debug("Failed to find the active layer in WMTS layer capabilities.");
    activeLayer = layers?.[0];
    if (!activeLayer) {
      LOG.debug("No layer in WMTS capabilities - giving up.");
      return void 0;
    }
  }
  const styles = activeLayer.Style;
  let activeStyle = styles?.find((style) => style?.Identifier === activeStyleId);
  if (!activeStyle) {
    LOG.debug("Failed to find active style in WMTS layer.");
    activeStyle = styles?.[0];
    if (!activeStyle) {
      LOG.debug("No style in WMTS layer capabilities - giving up.");
      return void 0;
    }
  }
  const legendUrl = activeStyle.LegendURL?.[0]?.href;
  return legendUrl;
}

export { WMTSLayerImpl };
//# sourceMappingURL=WMTSLayerImpl.js.map
