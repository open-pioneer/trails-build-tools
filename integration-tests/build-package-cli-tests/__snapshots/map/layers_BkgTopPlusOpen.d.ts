import WMTS from "ol/source/WMTS";
/** @internal */
export interface BkgTopPlusOpenProps {
    /**
     * The name of the requesting layer.
     * @default "web"
     */
    layer?: "web" | "web_grau" | "web_light";
}
/**
 * Layer source for BKG TopPlus Open.
 *
 * Used for @open-pioneer unit tests: not part of the public interface.
 *
 * @see https://gdz.bkg.bund.de/index.php/default/wmts-topplusopen-wmts-topplus-open.html
 *
 * @internal
 */
export declare class BkgTopPlusOpen extends WMTS {
    constructor(options?: BkgTopPlusOpenProps);
}
