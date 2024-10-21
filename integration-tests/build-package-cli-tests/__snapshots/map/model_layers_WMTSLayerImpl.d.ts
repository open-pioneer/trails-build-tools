import TileLayer from "ol/layer/Tile";
import type TileSourceType from "ol/source/Tile";
import { WMTSLayer, WMTSLayerConfig } from "../../api";
import { AbstractLayer } from "../AbstractLayer";
import { MapModelImpl } from "../MapModelImpl";
export declare class WMTSLayerImpl extends AbstractLayer implements WMTSLayer {
    #private;
    constructor(config: WMTSLayerConfig);
    destroy(): void;
    get legend(): string | undefined;
    __attach(map: MapModelImpl): void;
    get layer(): TileLayer<TileSourceType>;
    get url(): string;
    get name(): string;
    get matrixSet(): string;
    get sublayers(): undefined;
}
export declare function getWMTSLegendUrl(capabilities: Record<string, any>, activeLayerId: string | undefined, activeStyleId: string | undefined): string | undefined;
