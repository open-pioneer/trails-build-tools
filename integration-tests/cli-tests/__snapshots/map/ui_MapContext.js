import { createContext, useContext } from 'react';

const MapContext = createContext(void 0);
MapContext.displayName = "MapContext";
const MapContextProvider = MapContext.Provider;
function useMapContext() {
  const contextValue = useContext(MapContext);
  if (!contextValue) {
    throw new Error(
      `Map context is not available. The component must be a child of the <MapContainer /> component.`
    );
  }
  return contextValue;
}

export { MapContextProvider, useMapContext };
//# sourceMappingURL=MapContext.js.map
