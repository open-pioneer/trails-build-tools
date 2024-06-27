import { createLogger } from '@open-pioneer/core';
import OlMap from 'ol/Map';
import View from 'ol/View';
import Attribution from 'ol/control/Attribution';
import { getCenter } from 'ol/extent';
import TileLayer from 'ol/layer/Tile';
import { get } from 'ol/proj';
import OSM from 'ol/source/OSM';
import { defaults, DragZoom } from 'ol/interaction';
import { MapModelImpl } from './MapModelImpl.js';
import { registerProjections } from '../projections.js';
import { patchOpenLayersClassesForTesting } from '../util/ol-test-support.js';

registerProjections({
  "EPSG:25832": "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs",
  "EPSG:25833": "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"
});
const LOG = createLogger("map:createMapModel");
async function createMapModel(mapId, mapConfig, httpService) {
  return await new MapModelFactory(mapId, mapConfig, httpService).createMapModel();
}
class MapModelFactory {
  mapId;
  mapConfig;
  httpService;
  constructor(mapId, mapConfig, httpService) {
    this.mapId = mapId;
    this.mapConfig = mapConfig;
    this.httpService = httpService;
  }
  async createMapModel() {
    const mapId = this.mapId;
    const mapConfig = this.mapConfig;
    const { view: viewOption, ...rawOlOptions } = mapConfig.advanced ?? {};
    const mapOptions = {
      ...rawOlOptions
    };
    if (!mapOptions.controls) {
      mapOptions.controls = [new Attribution({ collapsible: false })];
    }
    if (!mapOptions.interactions) {
      const shiftCtrlKeysOnly = (mapBrowserEvent) => {
        const originalEvent = mapBrowserEvent.originalEvent;
        return (originalEvent.metaKey || originalEvent.ctrlKey) && originalEvent.shiftKey;
      };
      mapOptions.interactions = defaults({
        dragPan: true,
        altShiftDragRotate: false,
        pinchRotate: false,
        mouseWheelZoom: true
      }).extend([new DragZoom({ out: true, condition: shiftCtrlKeysOnly })]);
    }
    const view = await viewOption ?? {};
    this.initializeViewOptions(view);
    mapOptions.view = view instanceof View ? view : new View(view);
    if (!mapOptions.layers && !mapConfig.layers) {
      mapOptions.layers = [
        new TileLayer({
          source: new OSM()
        })
      ];
    }
    const initialView = mapConfig.initialView;
    const initialExtent = initialView?.kind === "extent" ? initialView.extent : void 0;
    LOG.debug(`Constructing OpenLayers map with options`, mapOptions);
    if (import.meta.env.VITEST) {
      patchOpenLayersClassesForTesting();
    }
    const olMap = new OlMap(mapOptions);
    const mapModel = new MapModelImpl({
      id: mapId,
      olMap,
      initialExtent,
      httpService: this.httpService
    });
    try {
      if (mapConfig.layers) {
        for (const layerConfig of mapConfig.layers) {
          mapModel.layers.addLayer(layerConfig);
        }
      }
      return mapModel;
    } catch (e) {
      mapModel.destroy();
      throw e;
    }
  }
  initializeViewOptions(view) {
    const mapId = this.mapId;
    const mapConfig = this.mapConfig;
    if (view instanceof View) {
      const warn = (prop) => {
        LOG.warn(
          `The advanced configuration for map id '${mapId}' has provided a fully constructed view instance: ${prop} cannot be applied.
Use ViewOptions instead of a View instance.`
        );
      };
      if (mapConfig.projection != null) {
        warn("projection");
      }
      if (mapConfig.initialView != null) {
        warn("initialView");
      }
      return;
    }
    const projection = view.projection = this.initializeProjection(mapConfig.projection);
    const initialView = mapConfig.initialView;
    if (initialView) {
      switch (initialView.kind) {
        case "position":
          view.zoom = initialView.zoom;
          view.center = [initialView.center.x, initialView.center.y];
          break;
        case "extent": {
          const extent = initialView.extent;
          view.zoom = 0;
          view.center = [
            extent.xMin + (extent.xMax - extent.xMin) / 2,
            extent.yMin + (extent.yMax - extent.yMin) / 2
          ];
          break;
        }
      }
    } else {
      this.setViewDefaults(view, projection);
    }
  }
  setViewDefaults(view, projection) {
    if (view.center == null) {
      const extent = projection.getExtent();
      if (!extent) {
        LOG.warn(
          `Cannot set default center coordinate because the current projection has no associated extent.
Try to configure 'initialView' explicity.`
        );
      } else {
        view.center = getCenter(extent);
      }
    }
    if (view.zoom == null || view.resolution == null) {
      view.zoom = 0;
    }
  }
  initializeProjection(projectionOption) {
    if (projectionOption == null) {
      return get("EPSG:3857");
    }
    const projection = get(projectionOption);
    if (!projection) {
      throw new Error(`Failed to retrieve projection for code '${projectionOption}'.`);
    }
    return projection;
  }
}

export { createMapModel };
//# sourceMappingURL=createMapModel.js.map
