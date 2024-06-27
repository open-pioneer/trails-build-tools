import { getHeight, getWidth } from 'ol/extent.js';

const DEFAULT_BUFFER_FACTOR = 1.2;
function calculateBufferedExtent(extent, factor = DEFAULT_BUFFER_FACTOR) {
  checkExtent(extent);
  const width = getHeight(extent);
  const height = getWidth(extent);
  const bufferWidth = width * factor;
  const bufferHeight = height * factor;
  const bufferedExtent = [
    extent[0] - (bufferWidth - width) / 2,
    extent[1] - (bufferHeight - height) / 2,
    extent[2] + (bufferWidth - width) / 2,
    extent[3] + (bufferHeight - height) / 2
  ];
  return bufferedExtent;
}
function checkExtent(extent) {
  if (extent.length !== 4) {
    throw new Error(`Invalid extent (expected length 4, but got length ${extent.length}).`);
  }
}

export { calculateBufferedExtent };
//# sourceMappingURL=geometry-utils.js.map
