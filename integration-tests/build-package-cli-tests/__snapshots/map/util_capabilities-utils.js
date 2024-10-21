async function fetchCapabilities(url, httpService, signal) {
  const response = await httpService.fetch(url, { signal });
  if (!response.ok) {
    throw new Error("Request failed: " + response.status);
  }
  const result = await response.text();
  return result;
}

export { fetchCapabilities };
//# sourceMappingURL=capabilities-utils.js.map
