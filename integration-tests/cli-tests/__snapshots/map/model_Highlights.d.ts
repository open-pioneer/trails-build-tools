import OlMap from "ol/Map";
import { LineString, Point, Polygon } from "ol/geom";
import { HighlightOptions } from "../api/MapModel";
export declare class Highlights {
    private olMap;
    private currentHighlight;
    constructor(olMap: OlMap);
    destroy(): void;
    /**
     * This method shows the position of a text search result zoomed to and marked or highlighted in the map.
     */
    addHighlightOrMarkerAndZoom(geometries: Point[] | LineString[] | Polygon[], options: HighlightOptions): void;
    clearHighlight(): void;
    private zoomAndAddMarkers;
    private createAndAddLayer;
}
