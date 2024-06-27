import { createLogger, EventEmitter, isAbortError, createManualPromise, createAbortError } from '@open-pioneer/core';
import { unByKey } from 'ol/Observable';
import { getCenter } from 'ol/extent';
import { LayerCollectionImpl } from './LayerCollectionImpl.js';
import { Highlights } from './Highlights.js';

const LOG = createLogger("map:MapModel");
class MapModelImpl extends EventEmitter {
  #id;
  #olMap;
  #layers = new LayerCollectionImpl(this);
  #highlights;
  #sharedDeps;
  #destroyed = false;
  #container;
  #initialExtent;
  #targetWatchKey;
  #abortController = new AbortController();
  #displayStatus;
  #displayWaiter;
  constructor(properties) {
    super();
    this.#id = properties.id;
    this.#olMap = properties.olMap;
    this.#initialExtent = properties.initialExtent;
    this.#sharedDeps = {
      httpService: properties.httpService
    };
    this.#highlights = new Highlights(this.#olMap);
    this.#displayStatus = "waiting";
    this.#initializeView().then(
      () => {
        this.#displayStatus = "ready";
        this.#displayWaiter?.resolve();
        this.#displayWaiter = void 0;
      },
      (error) => {
        if (!isAbortError(error)) {
          LOG.error(`Failed to initialize map`, error);
        }
        this.#displayStatus = "error";
        this.#displayWaiter?.reject(new Error(`Failed to initialize map.`));
        this.#displayWaiter = void 0;
      }
    );
    this.#targetWatchKey = this.#olMap.on("change:target", () => {
      this.#onTargetChanged();
    });
  }
  destroy() {
    if (this.#destroyed) {
      return;
    }
    this.#destroyed = true;
    try {
      this.emit("destroy");
    } catch (e) {
      LOG.warn(`Unexpected error from event listener during map model destruction:`, e);
    }
    if (this.#targetWatchKey) {
      unByKey(this.#targetWatchKey);
    }
    this.#targetWatchKey = void 0;
    this.#abortController.abort();
    this.#displayWaiter?.reject(new Error("Map model was destroyed."));
    this.#layers.destroy();
    this.#highlights.destroy();
    this.#olMap.dispose();
  }
  get id() {
    return this.#id;
  }
  get olMap() {
    return this.#olMap;
  }
  get layers() {
    return this.#layers;
  }
  get container() {
    return this.#container;
  }
  get initialExtent() {
    return this.#initialExtent;
  }
  get __sharedDependencies() {
    return this.#sharedDeps;
  }
  highlight(geometries, options) {
    return this.#highlights.addHighlight(geometries, options);
  }
  zoom(geometries, options) {
    this.#highlights.zoomToHighlight(geometries, options);
  }
  highlightAndZoom(geometries, options) {
    return this.#highlights.addHighlightAndZoom(geometries, options ?? {});
  }
  removeHighlights() {
    this.#highlights.clearHighlight();
  }
  whenDisplayed() {
    if (this.#destroyed) {
      return Promise.reject(new Error("Map model was destroyed."));
    }
    if (this.#displayStatus === "error") {
      return Promise.reject(new Error(`Failed to initialize map.`));
    }
    if (this.#displayStatus === "ready") {
      return Promise.resolve();
    }
    return (this.#displayWaiter ??= createManualPromise()).promise;
  }
  /**
   * Waits for the map to be displayed and then initializes the view (if necessary).
   *
   * May simply resolve when done, or throw an error when a problem occurs.
   * AbortError is thrown when cancelled via `this.#abortController`, for example
   * when the map model is destroyed before it has ever been displayed.
   */
  async #initializeView() {
    try {
      await waitForMapSize(this.olMap, this.#abortController.signal);
    } catch (e) {
      if (isAbortError(e)) {
        throw e;
      }
      throw new Error(`Failed to wait for the map to be displayed.`, { cause: e });
    }
    try {
      const olMap = this.#olMap;
      const view = olMap.getView();
      if (this.#initialExtent) {
        const extent = this.#initialExtent;
        const olExtent = [extent.xMin, extent.yMin, extent.xMax, extent.yMax];
        const olCenter = getCenter(olExtent);
        const resolution = view.getResolutionForExtent(olExtent);
        LOG.debug(`Applying initial extent`, extent);
        LOG.debug(`  Computed center:`, olCenter);
        LOG.debug(`  Computed resolution:`, resolution);
        view.setCenter(olCenter);
        view.setResolution(resolution);
      } else {
        const olExtent = view.calculateExtent();
        const [xMin = 0, yMin = 0, xMax = 0, yMax = 0] = olExtent;
        const extent = { xMin, yMin, xMax, yMax };
        LOG.debug(`Detected initial extent`, extent);
        this.#initialExtent = extent;
        this.emit("changed:initialExtent");
        this.emit("changed");
      }
    } catch (e) {
      throw new Error(`Failed to apply the initial extent.`, { cause: e });
    }
  }
  #onTargetChanged() {
    const newContainer = this.#olMap.getTargetElement() ?? void 0;
    if (this.#container !== newContainer) {
      this.#container = newContainer;
      this.emit("changed:container");
      this.emit("changed");
    }
  }
}
function waitForMapSize(olMap, signal) {
  const promise = new Promise((resolve, reject) => {
    let eventKey;
    function checkSize() {
      const currentSize = olMap.getSize() ?? [];
      const [width = 0, height = 0] = currentSize;
      if (currentSize && width > 0 && height > 0) {
        finish();
      }
    }
    function onAbort() {
      finish(createAbortError());
    }
    function finish(error) {
      if (eventKey) {
        unByKey(eventKey);
        eventKey = void 0;
      }
      signal.removeEventListener("abort", onAbort);
      if (error) {
        reject(error);
      } else {
        resolve(wait(25));
      }
    }
    if (signal.aborted) {
      finish(createAbortError());
      return;
    }
    signal.addEventListener("abort", onAbort);
    eventKey = olMap.on("change:size", checkSize);
  });
  return promise;
}
function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export { MapModelImpl };
//# sourceMappingURL=MapModelImpl.js.map
