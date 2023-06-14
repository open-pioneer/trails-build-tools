import { jsx, jsxs } from 'react/jsx-runtime';
import { ScaleFade, Checkbox, Slider, SliderTrack, SliderFilledTrack, Tooltip, SliderThumb } from '@open-pioneer/chakra-integration';
import { useMap } from '@open-pioneer/experimental-ol-map';
import { unByKey } from 'ol/Observable';
import { useIntl } from './_virtual/_virtual-pioneer-module_react-hooks.js';
import { useMemo, useState, useEffect } from 'react';
import { useTimeout } from 'react-use';

function LayerControlComponent(config) {
  const intl = useIntl();
  const { loading, error, map } = useMap(config.mapId);
  const layers = useMemo(() => map?.getAllLayers().reverse() ?? [], [map]);
  const [hasTimeoutElapsed] = useTimeout(100);
  const fadeIn = !loading || hasTimeoutElapsed() || false;
  return /* @__PURE__ */ jsx(ScaleFade, { in: fadeIn, children: loading ? /* @__PURE__ */ jsx("div", { children: intl.formatMessage({ id: "loading" }) }) : error ? /* @__PURE__ */ jsxs("div", { children: [
    intl.formatMessage({ id: "error" }),
    " ",
    error.message
  ] }) : /* @__PURE__ */ jsx("div", { children: layers.map((layer, i) => /* @__PURE__ */ jsxs("div", { className: "layer-entry", children: [
    /* @__PURE__ */ jsx(
      LayerVisibilityTogglerComponent,
      {
        layer
      }
    ),
    config.showOpacitySlider && /* @__PURE__ */ jsx(
      LayerOpacitySliderComponent,
      {
        layer
      }
    )
  ] }, i)) }) });
}
function LayerVisibilityTogglerComponent(props) {
  const intl = useIntl();
  const [visibility, setVisibility] = useState(props.layer.getVisible());
  const title = props.layer.getProperties().title ?? intl.formatMessage({ id: "undefined-layer-title" });
  const changeVisibility = () => {
    setVisibility(!visibility);
    props.layer.setVisible(!visibility);
  };
  return /* @__PURE__ */ jsx(
    Checkbox,
    {
      className: "layer-select",
      size: "lg",
      isChecked: visibility,
      onChange: changeVisibility,
      children: title
    }
  );
}
function LayerOpacitySliderComponent(props) {
  const [sliderValue, setSliderValue] = useState(props.layer.getOpacity() * 100);
  const [showTooltip, setShowTooltip] = useState(false);
  useEffect(() => {
    const opacityChangeListener = props.layer.on("change:opacity", () => {
      const opacity = props.layer.getOpacity() * 100;
      if (opacity !== sliderValue) {
        setSliderValue(Math.round(opacity));
      }
    });
    return () => unByKey(opacityChangeListener);
  }, []);
  return /* @__PURE__ */ jsxs(
    Slider,
    {
      id: "slider",
      value: sliderValue,
      min: 0,
      max: 100,
      colorScheme: "teal",
      onChange: (v) => props.layer.setOpacity(v / 100),
      onMouseEnter: () => setShowTooltip(true),
      onMouseLeave: () => setShowTooltip(false),
      children: [
        /* @__PURE__ */ jsx(SliderTrack, { children: /* @__PURE__ */ jsx(SliderFilledTrack, {}) }),
        /* @__PURE__ */ jsx(
          Tooltip,
          {
            hasArrow: true,
            bg: "teal.500",
            color: "white",
            placement: "top",
            isOpen: showTooltip,
            label: `${sliderValue}%`,
            children: /* @__PURE__ */ jsx(SliderThumb, { bg: "teal.500" })
          }
        )
      ]
    }
  );
}

export { LayerControlComponent };
//# sourceMappingURL=LayerControlComponent.js.map
