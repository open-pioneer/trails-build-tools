import { AbstractLayer } from "../AbstractLayer";
/**
 * A simple layer that accepts a custom OpenLayer's layer instance.
 *
 * Some API features (such as sublayers) will not be available.
 */
export declare class SimpleLayerImpl extends AbstractLayer {
    get legend(): undefined;
    get sublayers(): undefined;
}
