import { MapModelImpl } from "./MapModelImpl";
import { MapConfig } from "../api";
export declare function createMapModel(mapId: string, mapConfig: MapConfig): Promise<MapModelImpl>;
