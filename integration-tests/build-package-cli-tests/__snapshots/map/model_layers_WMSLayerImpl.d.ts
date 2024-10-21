import ImageWMS from "ol/source/ImageWMS";
import { WMSLayer, WMSLayerConfig, WMSSublayer, WMSSublayerConfig } from "../../api";
import { AbstractLayer } from "../AbstractLayer";
import { AbstractLayerBase } from "../AbstractLayerBase";
import { MapModelImpl } from "../MapModelImpl";
import { SublayersCollectionImpl } from "../SublayersCollectionImpl";
export declare class WMSLayerImpl extends AbstractLayer implements WMSLayer {
    #private;
    constructor(config: WMSLayerConfig);
    get legend(): undefined;
    get url(): string;
    get __source(): ImageWMS;
    get sublayers(): SublayersCollectionImpl<WMSSublayerImpl>;
    get capabilities(): Record<string, any> | undefined;
    __attach(map: MapModelImpl): void;
    /** Called by the sublayers when their visibility changed. */
    __updateSublayerVisibility(): void;
}
declare class WMSSublayerImpl extends AbstractLayerBase implements WMSSublayer {
    #private;
    constructor(config: WMSSublayerConfig);
    get name(): string | undefined;
    get sublayers(): SublayersCollectionImpl<WMSSublayerImpl>;
    get parent(): WMSSublayerImpl | WMSLayerImpl;
    get parentLayer(): WMSLayerImpl;
    get legend(): string | undefined;
    set legend(legendUrl: string | undefined);
    /**
     * Called by the parent layer when it is attached to the map to attach all sublayers.
     */
    __attach(map: MapModelImpl, parentLayer: WMSLayerImpl, parent: WMSLayerImpl | WMSSublayerImpl): void;
    get visible(): boolean;
    setVisible(newVisibility: boolean): void;
}
/** extract the legend url from the service capabilities */
export declare function getWMSLegendUrl(capabilities: Record<string, any>, layerName: string): undefined;
export {};
