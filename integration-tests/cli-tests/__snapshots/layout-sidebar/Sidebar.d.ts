import { ReactElement, ReactNode } from "react";
export interface SidebarItem {
    /**
     * Unique identifier
     */
    id: string;
    /**
     * Element which is shown in the sidebar menu as icon
     */
    icon: ReactElement;
    /**
     * Label in the menu entry
     */
    label: string;
    /**
     * Corresponding content to the sidebar entry
     */
    content: ReactNode;
}
/**
 * Sidebar configuration
 */
export interface SidebarProperties {
    /**
     * Defines if the sidebar initially is expanded
     */
    defaultExpanded?: boolean;
    /**
     * Event which is triggered when the main section is expanded/collapsed.
     */
    expandedChanged?: (expanded: boolean) => void;
    /**
     * Event which is triggered when sidebar width is changed and returns the new width.
     */
    sidebarWidthChanged?: (width: number) => void;
    /**
     * The visible menu entries and their corrensponding content.
     */
    items?: SidebarItem[];
}
export declare function Sidebar({ defaultExpanded, expandedChanged, sidebarWidthChanged, items }: SidebarProperties): import("react/jsx-runtime").JSX.Element;
