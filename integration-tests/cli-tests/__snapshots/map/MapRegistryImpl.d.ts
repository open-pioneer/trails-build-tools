import { Service, ServiceOptions, ServiceType } from "@open-pioneer/runtime";
import OlMap from "ol/Map";
import { MapModel, MapRegistry } from "./api";
interface References {
    providers: ServiceType<"map.MapConfigProvider">[];
}
export declare class MapRegistryImpl implements Service, MapRegistry {
    #private;
    constructor(options: ServiceOptions<References>);
    destroy(): void;
    getMapModel(mapId: string): Promise<MapModel | undefined>;
    expectMapModel(mapId: string): Promise<MapModel>;
    getMapModelByRawInstance(olMap: OlMap): MapModel | undefined;
}
export {};
