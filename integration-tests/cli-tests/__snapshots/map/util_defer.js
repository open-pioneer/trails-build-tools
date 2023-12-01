function defer(func) {
  let executed = false;
  let timeout = setTimeout(() => {
    executed = true;
    timeout = void 0;
    func();
  });
  return {
    reschedule() {
      return !executed;
    },
    cancel() {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  };
}

export { defer };
//# sourceMappingURL=defer.js.map
