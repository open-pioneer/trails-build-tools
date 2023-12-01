import { Feature } from 'ol';
import { createEmpty, extend, getCenter, getArea } from 'ol/extent';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Icon, Stroke, Fill } from 'ol/style';
import { toFunction } from 'ol/style/Style';
import mapMarkerUrl from '../assets/images/mapMarker.png?url';
import { TOPMOST_LAYER_Z } from './LayerCollectionImpl.js';
import { calculateBufferedExtent } from '../util/geometry-utils.js';

const DEFAULT_OL_POINT_ZOOM_LEVEL = 17;
const DEFAULT_OL_MAX_ZOOM_LEVEL = 20;
class Highlights {
  olMap;
  currentHighlight;
  constructor(olMap) {
    this.olMap = olMap;
  }
  destroy() {
    this.clearHighlight();
  }
  /**
   * This method shows the position of a text search result zoomed to and marked or highlighted in the map.
   */
  addHighlightOrMarkerAndZoom(geometries, options) {
    this.clearHighlight();
    if (!geometries || !geometries.length) {
      return;
    }
    this.zoomAndAddMarkers(geometries, options);
  }
  clearHighlight() {
    if (this.currentHighlight) {
      this.olMap.removeLayer(this.currentHighlight);
      this.currentHighlight = void 0;
    }
  }
  zoomAndAddMarkers(geometries, options) {
    let extent = createEmpty();
    for (const geom of geometries) {
      extent = extend(extent, geom.getExtent());
    }
    const center = getCenter(extent);
    const isPoint = getArea(extent) === 0;
    const zoomScale = isPoint ? options?.pointZoom ?? DEFAULT_OL_POINT_ZOOM_LEVEL : options?.maxZoom ?? DEFAULT_OL_MAX_ZOOM_LEVEL;
    setCenter(this.olMap, center);
    zoomTo(this.olMap, extent, zoomScale);
    this.createAndAddLayer(geometries, options?.highlightStyle);
  }
  createAndAddLayer(geometries, highlightStyle) {
    const features = geometries.map((geometry) => {
      return new Feature({
        type: geometry.getType(),
        geometry
      });
    });
    const layer = new VectorLayer({
      className: "highlight-layer",
      source: new VectorSource({
        features
      }),
      style: function(feature, resolution) {
        return resolveStyle(feature, resolution, highlightStyle);
      }
    });
    layer.setZIndex(TOPMOST_LAYER_Z);
    this.olMap.addLayer(layer);
    this.currentHighlight = layer;
  }
}
function setCenter(olMap, coordinates) {
  coordinates && coordinates.length && olMap.getView().setCenter(coordinates);
}
function zoomTo(olMap, extent, zoomLevel) {
  if (extent) {
    const bufferedExtent = calculateBufferedExtent(extent);
    bufferedExtent && olMap.getView().fit(bufferedExtent, { maxZoom: zoomLevel });
  } else {
    zoomLevel && olMap.getView().setZoom(zoomLevel);
  }
}
function resolveStyle(feature, resolution, highlightStyle) {
  const type = feature.get("type");
  const style = toFunction(highlightStyle?.[type] ?? defaultHighlightStyle[type]);
  return style(feature, resolution);
}
const defaultHighlightStyle = {
  "Point": new Style({
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
  ]
};

export { Highlights };
//# sourceMappingURL=Highlights.js.map
