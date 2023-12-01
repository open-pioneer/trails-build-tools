import { EventEmitter } from "@open-pioneer/core";
import OlMap from "ol/Map";
import { ExtentConfig, HighlightOptions, MapModel, MapModelEvents } from "../api";
import { LayerCollectionImpl } from "./LayerCollectionImpl";
import { LineString, Point, Polygon } from "ol/geom";
export declare class MapModelImpl extends EventEmitter<MapModelEvents> implements MapModel {
    #private;
    constructor(properties: {
        id: string;
        olMap: OlMap;
        initialExtent: ExtentConfig | undefined;
    });
    destroy(): void;
    get id(): string;
    get olMap(): OlMap;
    get layers(): LayerCollectionImpl;
    get container(): HTMLElement | undefined;
    get initialExtent(): ExtentConfig | undefined;
    highlightAndZoom(geometries: Point[] | LineString[] | Polygon[], options?: HighlightOptions): void;
    removeHighlight(): void;
    whenDisplayed(): Promise<void>;
}
