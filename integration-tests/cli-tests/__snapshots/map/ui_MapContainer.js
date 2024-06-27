import { jsx } from 'react/jsx-runtime';
import { createLogger } from '@open-pioneer/core';
import { useCommonComponentProps } from '@open-pioneer/react-utils';
import { useRef, useEffect, useMemo } from 'react';
import { useMapModel } from './useMapModel.js';
import { MapContextProvider } from './MapContext.js';

const LOG = createLogger("map:MapContainer");
function MapContainer(props) {
  const {
    mapId,
    viewPadding,
    viewPaddingChangeBehavior,
    children,
    role,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy
  } = props;
  const { containerProps } = useCommonComponentProps("map-container", props);
  const mapElement = useRef(null);
  const modelState = useMapModel(mapId);
  const mapModel = modelState.map;
  useEffect(() => {
    if (modelState.kind === "loading") {
      return;
    }
    if (modelState.kind === "rejected") {
      LOG.error(`Cannot display the map. Caused by `, modelState.error);
      return;
    }
    if (!mapModel) {
      LOG.error(`No configuration available for map with id '${mapId}'.`);
      return;
    }
    if (mapElement.current) {
      const resource = registerMapTarget(mapModel, mapElement.current);
      return () => resource?.destroy();
    }
  }, [modelState, mapModel, mapId]);
  const mapContainerStyle = {
    height: "100%",
    position: "relative"
  };
  return /* @__PURE__ */ jsx(
    "div",
    {
      ...containerProps,
      role,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      ref: mapElement,
      style: mapContainerStyle,
      tabIndex: 0,
      children: mapModel && /* @__PURE__ */ jsx(
        MapContainerReady,
        {
          map: mapModel.olMap,
          viewPadding,
          viewPaddingChangeBehavior,
          children
        }
      )
    }
  );
}
function registerMapTarget(mapModel, target) {
  const mapId = mapModel.id;
  const olMap = mapModel.olMap;
  if (olMap.getTarget()) {
    LOG.error(
      `Failed to display the map: the map already has a target. There may be more than one <MapContainer />.`
    );
    return void 0;
  }
  LOG.isDebug() && LOG.debug(`Setting target of map '${mapId}':`, target);
  olMap.setTarget(target);
  let unregistered = false;
  return {
    destroy() {
      if (!unregistered) {
        LOG.isDebug() && LOG.debug(`Removing target of map '${mapId}':`, target);
        olMap.setTarget(void 0);
        unregistered = true;
      }
    }
  };
}
function MapContainerReady(props) {
  const {
    map,
    viewPadding: viewPaddingProp,
    viewPaddingChangeBehavior = "preserve-center",
    children
  } = props;
  const mapAnchorsHost = useMapAnchorsHost(map);
  const viewPadding = useMemo(() => {
    return {
      left: viewPaddingProp?.left ?? 0,
      right: viewPaddingProp?.right ?? 0,
      top: viewPaddingProp?.top ?? 0,
      bottom: viewPaddingProp?.bottom ?? 0
    };
  }, [viewPaddingProp]);
  useEffect(() => {
    const mapView = map?.getView();
    if (!map || !mapView) {
      return;
    }
    const oldCenter = mapView.getCenter();
    const oldPadding = fromOlPadding(mapView.padding);
    const oldExtent = extentIncludingPadding(map, oldPadding);
    mapView.padding = toOlPadding(viewPadding);
    switch (viewPaddingChangeBehavior) {
      case "preserve-center":
        mapView.animate({ center: oldCenter, duration: 300 });
        break;
      case "preserve-extent": {
        if (oldExtent) {
          mapView.animate({
            center: oldCenter,
            resolution: mapView.getResolutionForExtent(oldExtent),
            duration: 300
          });
        }
        break;
      }
    }
  }, [viewPadding, map, viewPaddingChangeBehavior]);
  const mapContext = useMemo(() => {
    return {
      map,
      mapAnchorsHost,
      padding: viewPadding
    };
  }, [map, viewPadding, mapAnchorsHost]);
  return /* @__PURE__ */ jsx(MapContextProvider, { value: mapContext, children });
}
function useMapAnchorsHost(olMap) {
  const div = useRef();
  if (!div.current) {
    div.current = document.createElement("div");
    div.current.classList.add("map-anchors");
  }
  useEffect(() => {
    const child = div.current;
    const overlayContainer = olMap.getOverlayContainerStopEvent();
    overlayContainer.insertBefore(child, overlayContainer.firstChild);
    return () => child.remove();
  }, [olMap]);
  return div.current;
}
function extentIncludingPadding(map, padding) {
  const size = map.getSize();
  if (!size || size.length < 2) {
    return void 0;
  }
  const [width, height] = size;
  const bottomLeft = map.getCoordinateFromPixel([padding.left, padding.bottom]);
  const topRight = map.getCoordinateFromPixel([
    Math.max(0, width - padding.right),
    Math.max(0, height - padding.top)
  ]);
  if (!bottomLeft || !topRight) {
    return void 0;
  }
  const [xmin, ymin] = bottomLeft;
  const [xmax, ymax] = topRight;
  return [xmin, ymin, xmax, ymax];
}
function fromOlPadding(padding) {
  return {
    top: padding?.[0] ?? 0,
    right: padding?.[1] ?? 0,
    bottom: padding?.[2] ?? 0,
    left: padding?.[3] ?? 0
  };
}
function toOlPadding(padding) {
  const { top, right, bottom, left } = padding;
  return [top, right, bottom, left];
}

export { MapContainer };
//# sourceMappingURL=MapContainer.js.map
