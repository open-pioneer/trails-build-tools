import type { Options as WMSSourceOptions } from "ol/source/ImageWMS";
import type { LayerBaseConfig, Layer, SublayersCollection, Sublayer, LayerConfig } from "./base";
/**
 * Configuration options to construct a WMS layer.
 */
export interface WMSLayerConfig extends LayerConfig {
    /** URL of the WMS service. */
    url: string;
    /** Configures the layer's sublayers. */
    sublayers?: WMSSublayerConfig[];
    /**
     * Additional source options for the layer's WMS source.
     *
     * NOTE: These options are intended for advanced configuration:
     * the WMS Layer manages some of the OpenLayers source options itself.
     */
    sourceOptions?: Partial<WMSSourceOptions>;
}
/**
 * Configuration options to construct the sublayers of a WMS layer.
 */
export interface WMSSublayerConfig extends LayerBaseConfig {
    /**
     * The name of the WMS sublayer in the service's capabilities.
     * Not mandatory, e.g. for WMS group layer. See [WMS spec](https://www.ogc.org/standard/wms/).
     */
    name?: string;
    /** Configuration for nested sublayers. */
    sublayers?: WMSSublayerConfig[];
}
/** Represents a WMS layer. */
export interface WMSLayer extends Layer {
    readonly sublayers: SublayersCollection<WMSSublayer>;
    /** The URL of the WMS service that was used during layer construction. */
    readonly url: string;
}
/** Represents a WMS sublayer */
export interface WMSSublayer extends Sublayer {
    /**
     * The name of the WMS sublayer in the service's capabilities.
     *
     * Is optional as a WMS group layer in a WMS service does not need to have a name.
     */
    readonly name: string | undefined;
}
/**
 * Constructor for {@link WMSLayer}.
 */
export interface WMSLayerConstructor {
    prototype: WMSLayer;
    /** Creates a new {@link WMSLayer}. */
    new (config: WMSLayerConfig): WMSLayer;
}
export declare const WMSLayer: WMSLayerConstructor;
