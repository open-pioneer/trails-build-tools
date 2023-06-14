import { OlComponentProps } from "@open-pioneer/experimental-ol-map";
export interface LayerControlProps extends OlComponentProps {
    /**
     * Sets visibility of opacity slider
     */
    showOpacitySlider?: boolean;
}
export declare function LayerControlComponent(config: LayerControlProps): import("react/jsx-runtime").JSX.Element;
