import type { Options as WMSSourceOptions } from "ol/source/ImageWMS";
import { Layer, LayerConfig } from "./base";
export interface WMTSLayerConfig extends LayerConfig {
    /** URL of the WMTS service. */
    url: string;
    /** The name of the WMTS layer in the service's capabilities. */
    name: string;
    /** The name of the tile matrix set in the service's capabilities. */
    matrixSet: string;
    /**
     * Additional source options for the layer's WMTS source.
     *
     * NOTE: These options are intended for advanced configuration:
     * the WMTS Layer manages some of the OpenLayers source options itself.
     */
    sourceOptions?: Partial<WMSSourceOptions>;
}
export interface WMTSLayer extends Layer {
    /** URL of the WMTS service. */
    readonly url: string;
    /** The name of the WMTS layer in the service's capabilities. */
    readonly name: string;
    /** The name of the tile matrix set in the service's capabilities. */
    readonly matrixSet: string;
}
export interface WMTSLayerConstructor {
    prototype: WMTSLayer;
    /** Creates a new {@link WMTSLayer}. */
    new (config: WMTSLayerConfig): WMTSLayer;
}
export declare const WMTSLayer: WMTSLayerConstructor;
