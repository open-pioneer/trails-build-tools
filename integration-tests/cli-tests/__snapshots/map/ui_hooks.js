import { unByKey } from 'ol/Observable';
import { getPointResolution } from 'ol/proj';
import { useMemo, useCallback, useSyncExternalStore } from 'react';

const DEFAULT_DPI = 25.4 / 0.28;
const INCHES_PER_METRE = 39.37;
function useView(map) {
  return useOlProperty(map, getView, watchView);
}
function getView(map) {
  return map.getView();
}
function watchView(map, cb) {
  return map.on("change:view", cb);
}
function useProjection(map) {
  const view = useView(map);
  return view?.getProjection();
}
function useResolution(map) {
  const view = useView(map);
  return useOlProperty(view, getResolution, watchResolution);
}
function getResolution(view) {
  return view.getResolution();
}
function watchResolution(view, cb) {
  return view.on("change:resolution", cb);
}
function useCenter(map) {
  const view = useView(map);
  return useOlProperty(view, getCenter, watchCenter);
}
function getCenter(view) {
  return view.getCenter();
}
function watchCenter(view, cb) {
  return view.on("change:center", cb);
}
function useScale(map) {
  const center = useCenter(map);
  const resolution = useResolution(map);
  const projection = useProjection(map);
  const scale = useMemo(() => {
    if (projection == null || resolution == null || center == null) {
      return void 0;
    }
    const pointResolution = getPointResolution(projection, resolution, center);
    const scale2 = Math.round(pointResolution * INCHES_PER_METRE * DEFAULT_DPI);
    return scale2;
  }, [projection, resolution, center]);
  return scale;
}
function useOlProperty(object, accessor, watcher) {
  const getSnapshot = useCallback(
    () => object ? accessor(object) : void 0,
    [object, accessor]
  );
  const subscribe = useCallback(
    (cb) => {
      if (!object) {
        return () => void 0;
      }
      const key = watcher(object, cb);
      return () => unByKey(key);
    },
    [object, watcher]
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}

export { useCenter, useProjection, useResolution, useScale, useView };
//# sourceMappingURL=hooks.js.map
