import { Sublayer, WMSLayerConfig, WMSLayer, WMSSublayerConfig } from "../../api";
import { AbstractLayer } from "../AbstractLayer";
import { AbstractLayerBase } from "../AbstractLayerBase";
import { MapModelImpl } from "../MapModelImpl";
import { SublayersCollectionImpl } from "../SublayersCollectionImpl";
export declare class WMSLayerImpl extends AbstractLayer implements WMSLayer {
    #private;
    constructor(config: WMSLayerConfig);
    get url(): string;
    get sublayers(): SublayersCollectionImpl<WMSSublayerImpl>;
    __attach(map: MapModelImpl): void;
    /** Called by the sublayers when their visibility changed. */
    __updateSublayerVisibility(): void;
}
declare class WMSSublayerImpl extends AbstractLayerBase implements Sublayer {
    #private;
    constructor(config: WMSSublayerConfig);
    get name(): string;
    get sublayers(): SublayersCollectionImpl<WMSSublayerImpl>;
    get parent(): WMSSublayerImpl | WMSLayerImpl;
    get parentLayer(): WMSLayerImpl;
    /**
     * Called by the parent layer when it is attached to the map to attach all sublayers.
     */
    __attach(map: MapModelImpl, parentLayer: WMSLayerImpl, parent: WMSLayerImpl | WMSSublayerImpl): void;
    get visible(): boolean;
    setVisible(newVisibility: boolean): void;
}
export {};
