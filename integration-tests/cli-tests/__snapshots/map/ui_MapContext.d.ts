import { Provider } from "react";
import { type MapPadding } from "../api";
import type OlMap from "ol/Map";
/** Values provided to children of {@link MapContainer}. */
export interface MapContextType {
    map: OlMap;
    mapAnchorsHost: HTMLDivElement;
    padding: Required<MapPadding>;
}
export declare const MapContextProvider: Provider<MapContextType>;
export declare function useMapContext(): MapContextType;
