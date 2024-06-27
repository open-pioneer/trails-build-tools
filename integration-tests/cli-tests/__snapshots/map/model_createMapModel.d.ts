import { MapModelImpl } from "./MapModelImpl";
import { MapConfig } from "../api";
import { HttpService } from "@open-pioneer/http";
export declare function createMapModel(mapId: string, mapConfig: MapConfig, httpService: HttpService): Promise<MapModelImpl>;
