import { createLogger, throwAbortError, isAbortError } from '@open-pioneer/core';

const LOG = createLogger("search:SearchController");
const DEFAULT_SEARCH_TYPING_DELAY = 200;
const DEFAULT_MAX_RESULTS_PER_SOURCE = 5;
class SearchController {
  #mapModel;
  /**
   * Search sources defined by the developer.
   */
  #sources = [];
  /**
   * Limits the number of results per source.
   */
  #maxResultsPerSource = DEFAULT_MAX_RESULTS_PER_SOURCE;
  /**
   * The timeout in millis.
   */
  #searchTypingDelay = DEFAULT_SEARCH_TYPING_DELAY;
  /**
   * Cancel or abort a previous request.
   */
  #abortController;
  constructor(mapModel, sources) {
    this.#mapModel = mapModel;
    this.#sources = sources;
  }
  destroy() {
    this.#abortController?.abort();
    this.#abortController = void 0;
  }
  async search(searchTerm) {
    this.#abortController?.abort();
    this.#abortController = void 0;
    if (!searchTerm) {
      return [];
    }
    const abort = this.#abortController = new AbortController();
    try {
      await waitForTimeOut(abort.signal, this.#searchTypingDelay);
      if (abort.signal.aborted) {
        LOG.debug(`search canceled with ${searchTerm}`);
        throwAbortError();
      }
      const settledSearches = await Promise.all(
        this.#sources.map((source) => this.#searchSource(source, searchTerm, abort.signal))
      );
      return settledSearches.filter((s) => s != null);
    } finally {
      if (this.#abortController === abort) {
        this.#abortController = void 0;
      }
    }
  }
  async #searchSource(source, searchTerm, signal) {
    const label = source.label;
    const projection = this.#mapModel.olMap.getView().getProjection();
    try {
      const maxResults = this.#maxResultsPerSource;
      let results = await source.search(searchTerm, {
        maxResults,
        signal,
        mapProjection: projection
      });
      if (results.length > maxResults) {
        results = results.slice(0, maxResults);
      }
      return { label, source, results };
    } catch (e) {
      if (!isAbortError(e)) {
        LOG.error(`search for source ${label} failed`, e);
      }
      return void 0;
    }
  }
  get searchTypingDelay() {
    return this.#searchTypingDelay;
  }
  set searchTypingDelay(value) {
    this.#searchTypingDelay = value ?? DEFAULT_SEARCH_TYPING_DELAY;
  }
  get maxResultsPerSource() {
    return this.#maxResultsPerSource;
  }
  set maxResultsPerSource(value) {
    this.#maxResultsPerSource = value ?? DEFAULT_MAX_RESULTS_PER_SOURCE;
  }
  get sources() {
    return this.#sources;
  }
}
async function waitForTimeOut(signal, timeoutMillis) {
  if (signal.aborted) {
    return;
  }
  await new Promise((resolve) => {
    const done = () => {
      signal.removeEventListener("abort", done);
      clearTimeout(timeoutId);
      resolve();
    };
    signal.addEventListener("abort", done);
    const timeoutId = setTimeout(done, timeoutMillis);
  });
}

export { SearchController };
//# sourceMappingURL=SearchController.js.map
