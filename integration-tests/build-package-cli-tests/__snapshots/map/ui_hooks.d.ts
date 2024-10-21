import OlMap from "ol/Map";
import OlView from "ol/View";
import { Projection } from "ol/proj";
import { Coordinate } from "ol/coordinate";
/**
 * Returns the current view of the given map.
 */
export declare function useView(map: OlMap | undefined): OlView | undefined;
/**
 * Returns the current projection of the map.
 */
export declare function useProjection(map: OlMap | undefined): Projection | undefined;
/**
 * Returns the current resolution of the map.
 */
export declare function useResolution(map: OlMap | undefined): number | undefined;
/**
 * Returns the current center coordinates of the map.
 */
export declare function useCenter(map: OlMap | undefined): Coordinate | undefined;
/**
 * Returns the current scale of the map.
 */
export declare function useScale(map: OlMap | undefined): number | undefined;
