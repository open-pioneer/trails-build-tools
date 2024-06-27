import { EventEmitter } from "@open-pioneer/core";
import OlMap from "ol/Map";
import { ExtentConfig, Highlight, HighlightOptions, HighlightZoomOptions, MapModel, MapModelEvents } from "../api";
import { LayerCollectionImpl } from "./LayerCollectionImpl";
import { Geometry } from "ol/geom";
import { HttpService } from "@open-pioneer/http";
/**
 * Shared services or other entities propagated from the map model to all layer instances.
 */
export interface SharedDependencies {
    httpService: HttpService;
}
export declare class MapModelImpl extends EventEmitter<MapModelEvents> implements MapModel {
    #private;
    constructor(properties: {
        id: string;
        olMap: OlMap;
        initialExtent: ExtentConfig | undefined;
        httpService: HttpService;
    });
    destroy(): void;
    get id(): string;
    get olMap(): OlMap;
    get layers(): LayerCollectionImpl;
    get container(): HTMLElement | undefined;
    get initialExtent(): ExtentConfig | undefined;
    get __sharedDependencies(): SharedDependencies;
    highlight(geometries: Geometry[], options?: HighlightOptions | undefined): Highlight;
    zoom(geometries: Geometry[], options?: HighlightZoomOptions | undefined): void;
    highlightAndZoom(geometries: Geometry[], options?: HighlightZoomOptions): Highlight;
    removeHighlights(): void;
    whenDisplayed(): Promise<void>;
}
