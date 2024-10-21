import { EventEmitter } from "@open-pioneer/core";
import { LayerRetrievalOptions, Sublayer as SublayerInterface, SublayersCollection, SublayersCollectionEvents } from "../api";
import { AbstractLayerBase } from "./AbstractLayerBase";
export declare class SublayersCollectionImpl<Sublayer extends SublayerInterface & AbstractLayerBase> extends EventEmitter<SublayersCollectionEvents> implements SublayersCollection {
    #private;
    constructor(sublayers: Sublayer[]);
    destroy(): void;
    getSublayers(_options?: LayerRetrievalOptions | undefined): Sublayer[];
    /**
     * Returns a reference to the internal sublayers array.
     *
     * NOTE: Do not modify directly!
     */
    __getRawSublayers(): Sublayer[];
}
