import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { SearchIcon } from '@chakra-ui/icons';
import { chakra, CloseButton } from '@open-pioneer/chakra-integration';
import { chakraComponents } from 'chakra-react-select';
import classNames from 'classnames';
import { useIntl } from './_virtual/hooks.js';

function MenuComp(props) {
  const hasInput = props.selectProps.inputValue.length > 0;
  const menuProps = {
    ...props,
    className: classNames(props.className, {
      "search-invisible": !hasInput
    })
  };
  return /* @__PURE__ */ jsx(chakraComponents.Menu, { ...menuProps, children: props.children });
}
function NoOptionsMessage(props) {
  const intl = useIntl();
  const noMessageText = intl.formatMessage({ id: "noOptionsText" });
  return /* @__PURE__ */ jsx(chakraComponents.NoOptionsMessage, { ...props, children: /* @__PURE__ */ jsx(chakra.span, { className: "search-no-match", children: noMessageText }) });
}
function LoadingMessage(props) {
  const intl = useIntl();
  const loadingText = intl.formatMessage({ id: "loadingText" });
  return /* @__PURE__ */ jsx(chakraComponents.LoadingMessage, { ...props, children: /* @__PURE__ */ jsx(chakra.span, { className: "search-loading-text", children: loadingText }) });
}
function ValueContainer({
  children,
  ...props
}) {
  const containerProps = {
    ...props,
    className: classNames(props.className, "search-value-container")
  };
  return /* @__PURE__ */ jsxs(chakraComponents.ValueContainer, { ...containerProps, children: [
    !!children && /* @__PURE__ */ jsx(SearchIcon, { style: { position: "absolute", left: 8 } }),
    children
  ] });
}
function Input(props) {
  const inputProps = {
    ...props,
    isHidden: false
  };
  return /* @__PURE__ */ jsx(chakraComponents.Input, { ...inputProps });
}
function SingleValue(_props) {
  return null;
}
function IndicatorsContainer(props) {
  return /* @__PURE__ */ jsxs(chakraComponents.IndicatorsContainer, { ...props, children: [
    props.children,
    !props.selectProps.isLoading && props.selectProps.inputValue && /* @__PURE__ */ jsx(
      CustomClearIndicator,
      {
        selectProps: props.selectProps,
        clearValue: props.clearValue
      }
    )
  ] });
}
function CustomClearIndicator(props) {
  const intl = useIntl();
  const clearButtonLabel = intl.formatMessage({
    id: "ariaLabel.clearButton"
  });
  const clickHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    props.clearValue();
  };
  return /* @__PURE__ */ jsx(
    CloseButton,
    {
      role: "button",
      size: "md",
      mr: 1,
      "aria-label": clearButtonLabel,
      onClick: clickHandler,
      onTouchEnd: clickHandler,
      onMouseDown: (e) => e.preventDefault()
    }
  );
}
function ClearIndicator(_props) {
  return null;
}
function HighlightOption(props) {
  const userInput = props.selectProps.inputValue;
  const label = props.data.label;
  const optionProps = {
    ...props,
    className: classNames(props.className, "search-option")
  };
  return /* @__PURE__ */ jsx(chakraComponents.Option, { ...optionProps, children: /* @__PURE__ */ jsx(chakra.div, { className: "search-option-label", children: userInput.trim().length > 0 ? getHighlightedLabel(label, userInput) : label }) });
}
function getHighlightedLabel(label, userInput) {
  const matchIndex = label.toLowerCase().indexOf(userInput.toLowerCase());
  if (matchIndex >= 0) {
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      label.substring(0, matchIndex),
      /* @__PURE__ */ jsx(chakra.span, { className: "search-highlighted-match", children: label.substring(matchIndex, matchIndex + userInput.length) }, "highlighted"),
      label.substring(matchIndex + userInput.length)
    ] });
  }
  return label;
}

export { ClearIndicator, HighlightOption, IndicatorsContainer, Input, LoadingMessage, MenuComp, NoOptionsMessage, SingleValue, ValueContainer };
//# sourceMappingURL=CustomComponents.js.map
