import { EventEmitter } from '@open-pioneer/core';

class SublayersCollectionImpl extends EventEmitter {
  #sublayers;
  constructor(sublayers) {
    super();
    this.#sublayers = sublayers;
  }
  destroy() {
    for (const layer of this.#sublayers) {
      layer.destroy();
    }
    this.#sublayers = [];
  }
  getSublayers(_options) {
    return this.#sublayers.slice();
  }
  /**
   * Returns a reference to the internal sublayers array.
   *
   * NOTE: Do not modify directly!
   */
  __getRawSublayers() {
    return this.#sublayers;
  }
}

export { SublayersCollectionImpl };
//# sourceMappingURL=SublayersCollectionImpl.js.map
