import { SearchSource, SearchResult } from "./api";
import { MapModel } from "@open-pioneer/map";
/**
 * Group of suggestions returned from one source.
 */
export interface SuggestionGroup {
    label: string;
    source: SearchSource;
    results: SearchResult[];
}
export declare class SearchController {
    #private;
    constructor(mapModel: MapModel, sources: SearchSource[]);
    destroy(): void;
    search(searchTerm: string): Promise<SuggestionGroup[]>;
    get searchTypingDelay(): number;
    set searchTypingDelay(value: number | undefined);
    get maxResultsPerSource(): number;
    set maxResultsPerSource(value: number | undefined);
    get sources(): SearchSource[];
}
