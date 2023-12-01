import { CommonComponentProps } from "@open-pioneer/react-utils";
import { ReactNode } from "react";
/**
 * Map padding, all values are pixels.
 *
 * See https://openlayers.org/en/latest/apidoc/module-ol_View-View.html#padding
 */
export interface MapPadding {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
}
export interface MapContainerProps extends CommonComponentProps {
    /** The id of the map to display. */
    mapId: string;
    /**
     * Sets the map's padding directly.
     *
     * See: https://openlayers.org/en/latest/apidoc/module-ol_View-View.html#padding)
     */
    viewPadding?: MapPadding | undefined;
    /**
     * Behavior performed by the map when the view padding changes.
     *
     * - `none`: Do nothing.
     * - `preserve-center`: Ensures that the center point remains the same by animating the view.
     * - `preserve-extent`: Ensures that the extent remains the same by zooming.
     *
     * @default "preserve-center"
     */
    viewPaddingChangeBehavior?: "none" | "preserve-center" | "preserve-extent";
    children?: ReactNode;
    /**
     * Optional role property.
     *
     * This property is directly applied to the map's container div element.
     */
    role?: string;
    /**
     * Optional aria-labelledby property.
     * Do not use together with aria-label.
     *
     * This property is directly applied to the map's container div element.
     */
    "aria-labelledby"?: string;
    /**
     * Optional aria-label property.
     * Do not use together with aria-label.
     *
     * This property is directly applied to the map's container div element.
     */
    "aria-label"?: string;
}
/**
 * Displays the map with the given id.
 *
 * There can only be at most one MapContainer for every map.
 */
export declare function MapContainer(props: MapContainerProps): import("react/jsx-runtime").JSX.Element;
