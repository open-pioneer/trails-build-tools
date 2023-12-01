import { jsx } from 'react/jsx-runtime';
import { Box } from '@open-pioneer/chakra-integration';
import { useCommonComponentProps } from '@open-pioneer/react-utils';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useMapContext } from './MapContext.js';

const defaultPosition = "top-right";
function MapAnchor(props) {
  const {
    position = defaultPosition,
    stopEvents = true,
    children,
    horizontalGap,
    verticalGap
  } = props;
  const { containerProps } = useCommonComponentProps("map-anchor", props);
  const { padding, mapAnchorsHost } = useMapContext();
  const eventHandlers = useMemo(() => {
    const stopHandler = stopEvents ? stopPropagation : void 0;
    return {
      onPointerDown: stopHandler,
      onPointerUp: stopHandler,
      onContextMenu: stopHandler
    };
  }, [stopEvents]);
  return createPortal(
    /* @__PURE__ */ jsx(
      Box,
      {
        ...containerProps,
        pointerEvents: "auto",
        userSelect: "text",
        ...eventHandlers,
        ...computePositionStyles(position, padding, horizontalGap, verticalGap),
        children
      }
    ),
    mapAnchorsHost
  );
}
function computeAttributionGap(verticalGap) {
  const height = 20;
  const space = 10;
  return {
    gap: verticalGap === void 0 ? height + space : 0,
    space
  };
}
function computePositionStyles(position, padding, horizontalGap, verticalGap) {
  const props = {
    position: "absolute",
    transitionProperty: "left, right, top, bottom",
    transitionDuration: "200ms",
    transitionTimingFunction: "ease-out"
  };
  const defaultHorizontalGap = 0;
  const horizontal = horizontalGap ?? defaultHorizontalGap;
  const defaultVerticalGap = 0;
  const vertical = verticalGap ?? defaultVerticalGap;
  const attribution = computeAttributionGap(verticalGap);
  const gap = (n) => `${n}px`;
  switch (position) {
    case "top-left":
      props.left = gap(padding.left + horizontal);
      props.top = gap(padding.top + vertical);
      break;
    case "top-right":
      props.right = gap(padding.right + horizontal);
      props.top = gap(padding.top + vertical);
      break;
    case "bottom-left":
      props.left = gap(padding.left + horizontal);
      props.bottom = gap(padding.bottom + vertical + attribution.gap);
      break;
    case "bottom-right":
      props.right = gap(padding.right + horizontal);
      props.bottom = gap(padding.bottom + vertical + attribution.gap);
      break;
  }
  props.maxH = `calc((100%) - ${props.top ?? "0px"} - ${props.bottom ?? attribution.gap + "px"} - ${vertical + "px"} - ${attribution.space + "px"})`;
  props.maxW = `calc((100%) - ${props.left ?? "0px"} - ${props.right ?? "0px"} - ${horizontal + "px"})`;
  props.overflow = "hidden";
  return props;
}
function stopPropagation(e) {
  e.stopPropagation();
}

export { MapAnchor, computeAttributionGap, computePositionStyles };
//# sourceMappingURL=MapAnchor.js.map
