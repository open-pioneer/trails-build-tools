import { EventEmitter } from "@open-pioneer/core";
import OlBaseLayer from "ol/layer/Base";
import { LayerCollection, LayerCollectionEvents, Layer, LayerRetrievalOptions } from "../api";
import { AbstractLayer } from "./AbstractLayer";
import { AbstractLayerBase } from "./AbstractLayerBase";
import { MapModelImpl } from "./MapModelImpl";
/**
 * Z index for layers that should always be rendered on top of all other layers.
 * Note that this is an internal, unstable property!
 *
 * @internal
 */
export declare const TOPMOST_LAYER_Z = 9999999;
export declare class LayerCollectionImpl extends EventEmitter<LayerCollectionEvents> implements LayerCollection {
    #private;
    constructor(map: MapModelImpl);
    destroy(): void;
    addLayer(layer: Layer): void;
    getBaseLayers(): AbstractLayer[];
    getActiveBaseLayer(): AbstractLayer | undefined;
    activateBaseLayer(id: string | undefined): boolean;
    getOperationalLayers(options?: LayerRetrievalOptions): AbstractLayer[];
    getAllLayers(options?: LayerRetrievalOptions): AbstractLayer[];
    getLayerById(id: string): AbstractLayerBase | undefined;
    removeLayerById(id: string): void;
    getLayerByRawInstance(layer: OlBaseLayer): Layer | undefined;
}
