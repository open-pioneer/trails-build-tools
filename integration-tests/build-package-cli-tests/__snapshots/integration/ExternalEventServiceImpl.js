class ExternalEventServiceImpl {
  #ctx;
  constructor({ references }) {
    this.#ctx = references.ctx;
  }
  emitEvent(nameOrEvent, detail = null) {
    if (nameOrEvent == null) {
      return;
    }
    if (nameOrEvent instanceof Event) {
      this.#dispatch(nameOrEvent);
      return;
    }
    const event = new CustomEvent(nameOrEvent, {
      bubbles: false,
      cancelable: false,
      detail
    });
    this.#dispatch(event);
  }
  #dispatch(event) {
    this.#ctx.getHostElement().dispatchEvent(event);
  }
}

export { ExternalEventServiceImpl };
//# sourceMappingURL=ExternalEventServiceImpl.js.map
