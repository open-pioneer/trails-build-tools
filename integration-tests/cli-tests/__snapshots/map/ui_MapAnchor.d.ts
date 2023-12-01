import { StyleProps } from "@open-pioneer/chakra-integration";
import { CommonComponentProps } from "@open-pioneer/react-utils";
import { ReactNode } from "react";
import { MapPadding } from "./MapContainer";
export type MapAnchorPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export interface MapAnchorProps extends CommonComponentProps {
    /**
     * The position of the anchor container above the map.
     * @default "top-right"
     */
    position?: MapAnchorPosition;
    /**
     * Horizontal gap in pixel applied to anchor container.
     *
     * Applied:
     * - left, if position `*-left`
     * - right, if position `*-right`
     *
     * @default 0
     */
    horizontalGap?: number;
    /**
     * Vertical gap in pixel applied to anchor container.
     *
     * Applied:
     * - top, if position `top-*`
     * - bottom, if position `bottom-*`
     *
     * @default 0 (If position `bottom-*`, default verticalGap == `30`)
     */
    verticalGap?: number;
    /**
     * Prevent some events from the map anchor's children from bubbling towards the map, effectively hiding them from map interactions.
     * Defaults to `true`.
     *
     * If this value is enabled, events such as `pointer-down` are hidden from the map when they occur
     * within the map anchor.
     * This is essential when the user wants to select text, or open the browser context menu within the anchor.
     * If that is not required, set `stopEvents` to `false` instead.
     */
    stopEvents?: boolean;
    children?: ReactNode;
}
export declare function MapAnchor(props: MapAnchorProps): JSX.Element;
export declare function computeAttributionGap(verticalGap?: number): {
    gap: number;
    space: number;
};
export declare function computePositionStyles(position: MapAnchorPosition, padding: Required<MapPadding>, horizontalGap?: number | undefined, verticalGap?: number | undefined): StyleProps;
