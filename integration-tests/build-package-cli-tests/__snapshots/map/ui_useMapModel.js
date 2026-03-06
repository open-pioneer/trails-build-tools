import { useService } from '../_virtual/hooks.js';
import { useMemo } from 'react';
import { useAsync } from 'react-use';

function useMapModel(mapId) {
  const mapRegistry = useService("map.MapRegistry");
  const state = useAsync(() => mapRegistry.getMapModel(mapId), [mapRegistry, mapId]);
  const result = useMemo(() => {
    if (state.loading) {
      return { kind: "loading" };
    }
    if (state.error) {
      return { kind: "rejected", error: state.error };
    }
    return { kind: "resolved", map: state.value };
  }, [state]);
  return result;
}

export { useMapModel };
//# sourceMappingURL=useMapModel.js.map
