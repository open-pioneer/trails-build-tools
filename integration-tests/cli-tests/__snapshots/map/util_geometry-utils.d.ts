import { Extent } from "ol/extent";
/**
 * Computes a buffered extent using the given original extent.
 *
 * Use the `factor` (`1.2` by default) to specify the size increase.
 */
export declare function calculateBufferedExtent(extent: Extent, factor?: number): Extent;
