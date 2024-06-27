import { Feature } from "ol";
import OlMap from "ol/Map";
import { Geometry } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import { DisplayTarget, Highlight, HighlightOptions, HighlightZoomOptions, ZoomOptions } from "../api/MapModel";
export declare class Highlights {
    #private;
    private olMap;
    private olLayer;
    private olSource;
    private activeHighlights;
    constructor(olMap: OlMap);
    /**
     * Getter for Hightlightlayer
     * @returns Highlights.olLayer
     */
    getLayer(): VectorLayer<Feature<Geometry>>;
    /**
     * This method removes all highlights before destroying the class
     */
    destroy(): void;
    /**
     * This method displays geometries or BaseFeatures with optional styling in the map
     */
    addHighlight(displayTarget: DisplayTarget[], highlightOptions: HighlightOptions | undefined): Highlight;
    /**
     * This method zoom to geometries or BaseFeatures
     */
    zoomToHighlight(displayTarget: DisplayTarget[], options: ZoomOptions | undefined): void;
    /**
     * This method displays geometries or BaseFeatures with optional styling in the map and executed a zoom
     */
    addHighlightAndZoom(displayTarget: DisplayTarget[], highlightZoomStyle: HighlightZoomOptions | undefined): Highlight;
    clearHighlight(): void;
}
