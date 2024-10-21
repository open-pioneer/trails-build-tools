import { createLogger, EventEmitter } from '@open-pioneer/core';
import { v4 } from 'uuid';

const LOG = createLogger("map:AbstractLayerModel");
class AbstractLayerBase extends EventEmitter {
  #map;
  #id;
  #title;
  #description;
  #attributes;
  #destroyed = false;
  constructor(config) {
    super();
    this.#id = config.id ?? v4();
    this.#attributes = config.attributes ?? {};
    this.#title = config.title;
    this.#description = config.description ?? "";
  }
  get __destroyed() {
    return this.#destroyed;
  }
  get map() {
    const map = this.#map;
    if (!map) {
      throw new Error(`Layer '${this.id}' has not been attached to a map yet.`);
    }
    return map;
  }
  get id() {
    return this.#id;
  }
  get title() {
    return this.#title;
  }
  get description() {
    return this.#description;
  }
  get attributes() {
    return this.#attributes;
  }
  destroy() {
    if (this.#destroyed) {
      return;
    }
    this.#destroyed = true;
    this.sublayers?.destroy();
    try {
      this.emit("destroy");
    } catch (e) {
      LOG.warn(`Unexpected error from event listener during layer destruction:`, e);
    }
  }
  /**
   * Attaches the layer to its owning map.
   */
  __attachToMap(map) {
    if (this.#map) {
      throw new Error(
        `Layer '${this.id}' has already been attached to the map '${this.map.id}'`
      );
    }
    this.#map = map;
  }
  setTitle(newTitle) {
    if (newTitle !== this.#title) {
      this.#title = newTitle;
      this.__emitChangeEvent("changed:title");
    }
  }
  setDescription(newDescription) {
    if (newDescription !== this.#description) {
      this.#description = newDescription;
      this.__emitChangeEvent("changed:description");
    }
  }
  updateAttributes(newAttributes) {
    const attributes = this.#attributes;
    const keys = Reflect.ownKeys(newAttributes);
    let changed = false;
    for (const key of keys) {
      const existing = attributes[key];
      const value = newAttributes[key];
      if (existing !== value) {
        attributes[key] = value;
        changed = true;
      }
    }
    if (changed) {
      this.__emitChangeEvent("changed:attributes");
    }
  }
  deleteAttribute(deleteAttribute) {
    const attributes = this.#attributes;
    if (attributes[deleteAttribute]) {
      delete attributes[deleteAttribute];
      this.__emitChangeEvent("changed:attributes");
    }
  }
  __emitChangeEvent(event) {
    this.emit(event);
    this.emit("changed");
  }
}

export { AbstractLayerBase };
//# sourceMappingURL=AbstractLayerBase.js.map
