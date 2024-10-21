import { Feature } from 'ol';
import { createEmpty, extend, getCenter, getArea } from 'ol/extent.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { Style, Icon, Stroke, Fill } from 'ol/style.js';
import { toFunction } from 'ol/style/Style.js';
import mapMarkerUrl from '../assets/images/mapMarker.png?url';
import './AbstractLayer.js';
import './layers/WMSLayerImpl.js';
import './layers/WMTSLayerImpl.js';
import 'ol/proj/proj4.js';
import 'proj4';
import 'ol/source/WMTS.js';
import 'ol/tilegrid/WMTS.js';
import 'ol/Observable.js';
import 'ol/proj.js';
import 'react';
import 'react/jsx-runtime';
import '@open-pioneer/chakra-integration';
import '@open-pioneer/react-utils';
import 'react-dom';
import '../ui/MapContext.js';
import '../ui/MapContainer.js';
import '@open-pioneer/runtime/react-integration';
import 'react-use';
import { TOPMOST_LAYER_Z } from './LayerCollectionImpl.js';

const DEFAULT_OL_POINT_ZOOM_LEVEL = 17;
const DEFAULT_OL_MAX_ZOOM_LEVEL = 20;
const DEFAULT_VIEW_PADDING = { top: 50, right: 20, bottom: 10, left: 20 };
class Highlights {
  olMap;
  olLayer;
  olSource;
  activeHighlights;
  constructor(olMap) {
    this.olMap = olMap;
    this.olSource = new VectorSource({
      features: void 0
    });
    this.olLayer = new VectorLayer({
      className: "highlight-layer",
      source: this.olSource,
      style: function(feature, resolution) {
        return resolveStyle(feature, resolution);
      }
    });
    this.activeHighlights = /* @__PURE__ */ new Set();
    this.olLayer.setZIndex(TOPMOST_LAYER_Z);
    this.olMap.addLayer(this.olLayer);
  }
  /**
   * Getter for Hightlightlayer
   * @returns Highlights.olLayer
   */
  getLayer() {
    return this.olLayer;
  }
  /**
   * This method removes all highlights before destroying the class
   */
  destroy() {
    this.clearHighlight();
  }
  /**
   * Method of filtering out objects that are not geometry or have no property geometry.
   */
  #filterGeoobjects(geoObjects) {
    const geometries = [];
    geoObjects.forEach((item) => {
      if ("getType" in item) geometries.push(item);
      if ("geometry" in item && item.geometry) geometries.push(item.geometry);
    });
    return geometries;
  }
  /**
   * This method displays geometries or BaseFeatures with optional styling in the map
   */
  addHighlight(displayTarget, highlightOptions) {
    const geometries = this.#filterGeoobjects(displayTarget);
    if (geometries.length === 0) {
      return {
        get isActive() {
          return false;
        },
        destroy() {
        }
      };
    }
    const features = geometries.map((geometry) => {
      const type = geometry.getType();
      const feature = new Feature({
        type,
        geometry
      });
      feature.setStyle(getOwnStyle(type, highlightOptions?.highlightStyle));
      return feature;
    });
    const source = this.olSource;
    const highlights = this.activeHighlights;
    const highlight = {
      get isActive() {
        return highlights.has(highlight);
      },
      destroy() {
        if (!this.isActive) {
          return;
        }
        for (const feature of features) {
          source.removeFeature(feature);
        }
        highlights.delete(highlight);
      }
    };
    source.addFeatures(features);
    this.activeHighlights.add(highlight);
    return highlight;
  }
  /**
   * This method zoom to geometries or BaseFeatures
   */
  zoomToHighlight(displayTarget, options) {
    const geometries = this.#filterGeoobjects(displayTarget);
    if (geometries.length === 0) {
      return;
    }
    let extent = createEmpty();
    for (const geometry of geometries) {
      extent = extend(extent, geometry.getExtent());
    }
    const center = getCenter(extent);
    const isPoint = getArea(extent) === 0;
    const zoomScale = isPoint ? options?.pointZoom ?? DEFAULT_OL_POINT_ZOOM_LEVEL : options?.maxZoom ?? DEFAULT_OL_MAX_ZOOM_LEVEL;
    setCenter(this.olMap, center);
    const {
      top = 0,
      right = 0,
      bottom = 0,
      left = 0
    } = options?.viewPadding ?? DEFAULT_VIEW_PADDING;
    const padding = [top, right, bottom, left];
    zoomTo(this.olMap, extent, zoomScale, padding);
  }
  /**
   * This method displays geometries or BaseFeatures with optional styling in the map and executed a zoom
   */
  addHighlightAndZoom(displayTarget, highlightZoomStyle) {
    const result = this.addHighlight(displayTarget, highlightZoomStyle);
    this.zoomToHighlight(displayTarget, highlightZoomStyle);
    return result;
  }
  clearHighlight() {
    for (const highlight of this.activeHighlights) {
      highlight.destroy();
    }
  }
}
function setCenter(olMap, coordinates) {
  coordinates && coordinates.length && olMap.getView().setCenter(coordinates);
}
function zoomTo(olMap, extent, zoomLevel, padding) {
  if (extent) {
    olMap.getView().fit(extent, { maxZoom: zoomLevel, padding });
  } else {
    zoomLevel && olMap.getView().setZoom(zoomLevel);
  }
}
function resolveStyle(feature, resolution) {
  const type = feature.get("type");
  const style = toFunction(getDefaultStyle(type));
  return style(feature, resolution);
}
function getOwnStyle(type, highlightStyle) {
  if (highlightStyle && type in highlightStyle) {
    const supportedType = type;
    const ownStyle = highlightStyle[supportedType];
    return ownStyle ? ownStyle : getDefaultStyle(type);
  } else {
    return getDefaultStyle(type);
  }
}
function getDefaultStyle(type) {
  if (type in defaultHighlightStyle) {
    const supportedType = type;
    return defaultHighlightStyle[supportedType];
  } else {
    return defaultHighlightStyle.Polygon;
  }
}
const defaultHighlightStyle = {
  "Point": new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: mapMarkerUrl
    })
  }),
  "MultiPoint": new Style({
    image: new Icon({
      anchor: [0.5, 1],
      src: mapMarkerUrl
    })
  }),
  "LineString": [
    new Style({
      stroke: new Stroke({
        color: "#fff",
        width: 5
      })
    }),
    new Style({
      stroke: new Stroke({
        color: "#00ffff",
        width: 3
      })
    })
  ],
  "MultiLineString": [
    new Style({
      stroke: new Stroke({
        color: "#fff",
        width: 5
      })
    }),
    new Style({
      stroke: new Stroke({
        color: "#00ffff",
        width: 3
      })
    })
  ],
  "Polygon": [
    new Style({
      stroke: new Stroke({
        color: "#fff",
        width: 5
      })
    }),
    new Style({
      stroke: new Stroke({
        color: "#00ffff",
        width: 3
      }),
      fill: new Fill({
        color: "rgba(224,255,255,0.35)"
      })
    })
  ],
  "MultiPolygon": [
    new Style({
      stroke: new Stroke({
        color: "#fff",
        width: 5
      })
    }),
    new Style({
      stroke: new Stroke({
        color: "#00ffff",
        width: 3
      }),
      fill: new Fill({
        color: "rgba(224,255,255,0.35)"
      })
    })
  ]
};

export { Highlights };
//# sourceMappingURL=Highlights.js.map
