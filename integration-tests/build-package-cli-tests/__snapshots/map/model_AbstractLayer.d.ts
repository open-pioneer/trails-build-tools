import OlBaseLayer from "ol/layer/Base";
import { Layer, LayerLoadState, SimpleLayerConfig } from "../api";
import { AbstractLayerBase } from "./AbstractLayerBase";
import { MapModelImpl } from "./MapModelImpl";
/**
 * Base class for normal layer types.
 *
 * These layers always have an associated OpenLayers layer.
 */
export declare abstract class AbstractLayer<AdditionalEvents = {}> extends AbstractLayerBase<AdditionalEvents> implements Layer {
    #private;
    constructor(config: SimpleLayerConfig);
    get visible(): boolean;
    get olLayer(): OlBaseLayer;
    get isBaseLayer(): boolean;
    get loadState(): LayerLoadState;
    destroy(): void;
    /**
     * Called by the map model when the layer is added to the map.
     */
    __attach(map: MapModelImpl): void;
    setVisible(newVisibility: boolean): void;
    __setVisible(newVisibility: boolean): void;
}
