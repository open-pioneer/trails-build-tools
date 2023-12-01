import { MapModel } from "../api";
/** Return value of {@link useMapModel}. */
export type UseMapModelResult = {
    kind: "loading" | "resolved" | "rejected";
    map?: MapModel | undefined;
    error?: Error | undefined;
} | UseMapModelLoading | UseMapModelResolved | UseMapModelRejected;
export interface UseMapModelLoading {
    kind: "loading";
    map?: undefined;
    error?: undefined;
}
export interface UseMapModelResolved {
    kind: "resolved";
    map: MapModel;
    error?: undefined;
}
export interface UseMapModelRejected {
    kind: "rejected";
    map?: undefined;
    error: Error;
}
/**
 * React hooks that looks up the map with the given id in the `map.MapRegistry` service.
 *
 * Returns an object representing the progress, which will eventually represent either
 * the map model value or an initialization error.
 *
 * The map model cannot be returned directly because it may not have completed its initialization yet.
 */
export declare function useMapModel(mapId: string): UseMapModelResult;
