import { CommonComponentProps } from "@open-pioneer/react-utils";
import { FC } from "react";
import { SearchSource, SearchResult } from "./api";
export interface SearchOption {
    /** Unique value for this option. */
    value: string;
    /** Display text shown in menu. */
    label: string;
    /** Search source that returned the suggestion. */
    source: SearchSource;
    /** The raw result from the search source. */
    result: SearchResult;
}
export interface SearchGroupOption {
    /** Display text shown in menu. */
    label: string;
    /** Set of options that belong to this group. */
    options: SearchOption[];
}
/**
 * Event type emitted when the user selects an item.
 */
export interface SearchSelectEvent {
    /** The source that returned the {@link result}. */
    source: SearchSource;
    /** The search result selected by the user. */
    result: SearchResult;
}
/**
 * Properties supported by the {@link Search} component.
 */
export interface SearchProps extends CommonComponentProps {
    /**
     * The id of the map.
     */
    mapId: string;
    /**
     * Data sources to be searched on.
     */
    sources: SearchSource[];
    /**
     * Typing delay (in milliseconds) before the async search query starts after the user types in the search term.
     * Defaults to `200`.
     */
    searchTypingDelay?: number;
    /**
     * The maximum number of results shown per group.
     * Defaults to `5`.
     */
    maxResultsPerGroup?: number;
    /**
     * This event handler will be called when the user selects a search result.
     */
    onSelect?: (event: SearchSelectEvent) => void;
    /**
     * This event handler will be called when the user clears the search input.
     */
    onClear?: () => void;
}
/**
 * A component that allows the user to search a given set of {@link SearchSource | SearchSources}.
 */
export declare const Search: FC<SearchProps>;
