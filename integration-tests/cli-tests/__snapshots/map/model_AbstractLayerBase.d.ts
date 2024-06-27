import { EventEmitter, EventNames } from "@open-pioneer/core";
import { LayerBase, LayerBaseEvents, Sublayer } from "../api";
import { MapModelImpl } from "./MapModelImpl";
import { SublayersCollectionImpl } from "./SublayersCollectionImpl";
export interface AbstractLayerBaseOptions {
    id?: string;
    title: string;
    description?: string;
    attributes?: Record<string, unknown>;
}
/**
 * Base class for "normal" layers and sublayers alike to implement common properties
 * such as id, title and attributes.
 */
export declare abstract class AbstractLayerBase<AdditionalEvents = {}> extends EventEmitter<LayerBaseEvents & AdditionalEvents> implements LayerBase {
    #private;
    constructor(config: AbstractLayerBaseOptions);
    protected get __destroyed(): boolean;
    get map(): MapModelImpl;
    get id(): string;
    get title(): string;
    get description(): string;
    get attributes(): Record<string | symbol, unknown>;
    abstract get visible(): boolean;
    abstract get sublayers(): SublayersCollectionImpl<Sublayer & AbstractLayerBase> | undefined;
    abstract get legend(): string | undefined;
    destroy(): void;
    /**
     * Attaches the layer to its owning map.
     */
    protected __attachToMap(map: MapModelImpl): void;
    setTitle(newTitle: string): void;
    setDescription(newDescription: string): void;
    updateAttributes(newAttributes: Record<string | symbol, unknown>): void;
    deleteAttribute(deleteAttribute: string | symbol): void;
    abstract setVisible(newVisibility: boolean): void;
    protected __emitChangeEvent<Name extends EventNames<LayerBaseEvents & AdditionalEvents>>(event: Name): void;
}
