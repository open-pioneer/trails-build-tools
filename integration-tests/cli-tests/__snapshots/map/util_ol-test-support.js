import { equals } from 'ol/extent';
import OlMap from 'ol/Map';

let setupDone = false;
function patchOpenLayersClassesForTesting() {
  if (setupDone) {
    return;
  }
  OlMap.prototype.updateSize = function() {
    const target = this.getTargetElement();
    const height = 500;
    const width = 500;
    const size = target ? [width, height] : void 0;
    const oldSize = this.getSize();
    if (size && (!oldSize || !equals(size, oldSize))) {
      this.setSize(size);
      this.updateViewportSize_();
    }
  };
  setupDone = true;
}

export { patchOpenLayersClassesForTesting };
//# sourceMappingURL=ol-test-support.js.map
