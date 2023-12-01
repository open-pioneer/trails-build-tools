import { jsx } from 'react/jsx-runtime';
import { Box, useToken } from '@open-pioneer/chakra-integration';
import { createLogger, isAbortError } from '@open-pioneer/core';
import { useMapModel } from '@open-pioneer/map';
import { useCommonComponentProps, useEvent } from '@open-pioneer/react-utils';
import { Select } from 'chakra-react-select';
import { useIntl } from './_virtual/_virtual-pioneer-module_react-hooks.js';
import { useRef, useMemo, useState, useEffect, useReducer, useCallback } from 'react';
import { MenuComp, Input, SingleValue, HighlightOption, NoOptionsMessage, LoadingMessage, ValueContainer, IndicatorsContainer, ClearIndicator } from './CustomComponents.js';
import { SearchController } from './SearchController.js';

const LOG = createLogger("search:Search");
const Search = (props) => {
  const { mapId, sources, searchTypingDelay, maxResultsPerGroup, onSelect, onClear } = props;
  const { containerProps } = useCommonComponentProps("search", props);
  const { map } = useMapModel(mapId);
  const intl = useIntl();
  const controller = useController(sources, searchTypingDelay, maxResultsPerGroup, map);
  const { input, search: search2, selectedOption, onInputChanged, onResultConfirmed } = useSearchState(controller);
  const chakraStyles = useChakraStyles();
  const ariaMessages = useAriaMessages(intl);
  const components = useCustomComponents();
  const handleInputChange = useEvent((newValue, actionMeta) => {
    if (actionMeta.action === "input-change") {
      onInputChanged(newValue);
    }
  });
  const handleSelectChange = useEvent(
    (value, actionMeta) => {
      switch (actionMeta.action) {
        case "select-option":
          if (value) {
            onResultConfirmed(value);
            onSelect?.({
              source: value.source,
              result: value.result
            });
          }
          break;
        case "clear":
          onInputChanged("");
          selectRef.current?.blur();
          selectRef.current?.focus();
          onClear?.();
          break;
        default:
          LOG.debug(`Unhandled action type '${actionMeta.action}'.`);
          break;
      }
    }
  );
  const selectRef = useRef(null);
  return /* @__PURE__ */ jsx(Box, { ...containerProps, children: /* @__PURE__ */ jsx(
    Select,
    {
      className: "search-component",
      classNamePrefix: "react-select",
      ref: selectRef,
      inputValue: input,
      onInputChange: handleInputChange,
      "aria-label": intl.formatMessage({ id: "ariaLabel.search" }),
      ariaLiveMessages: ariaMessages,
      colorScheme: "trails",
      selectedOptionStyle: "color",
      selectedOptionColorScheme: "trails",
      chakraStyles,
      isClearable: true,
      placeholder: intl.formatMessage({ id: "searchPlaceholder" }),
      closeMenuOnSelect: true,
      isLoading: search2.kind === "loading",
      options: search2.kind === "ready" ? search2.results : void 0,
      filterOption: () => true,
      tabSelectsValue: false,
      components,
      onChange: handleSelectChange,
      value: selectedOption
    }
  ) });
};
function useAriaMessages(intl) {
  return useMemo(() => {
    const onFocus = ({ focused }) => {
      return `${focused.label} ${intl.formatMessage({ id: "ariaLabel.searchFocus" })}.`;
    };
    const onChange = ({ action, label }) => {
      let message = "";
      switch (action) {
        case "select-option":
          message = `${label} ${intl.formatMessage({ id: "ariaLabel.searchSelect" })}.`;
          break;
        case "clear":
          message = `${label} ${intl.formatMessage({ id: "ariaLabel.searchClear" })}.`;
          break;
      }
      return message;
    };
    const guidance = () => {
      return `${intl.formatMessage({ id: "ariaLabel.instructions" })}`;
    };
    const onFilter = () => {
      return "";
    };
    return {
      onFocus,
      onChange,
      guidance,
      onFilter
    };
  }, [intl]);
}
function useCustomComponents() {
  return useMemo(() => {
    return {
      Menu: MenuComp,
      Input,
      SingleValue: SingleValue,
      Option: HighlightOption,
      NoOptionsMessage,
      LoadingMessage,
      ValueContainer,
      IndicatorsContainer,
      ClearIndicator
    };
  }, []);
}
function useChakraStyles() {
  const [groupHeadingBg, focussedItemBg] = useToken(
    "colors",
    ["trails.100", "trails.50"],
    ["#d5e5ec", "#eaf2f5"]
  );
  return useMemo(() => {
    const chakraStyles = {
      groupHeading: (provided) => ({
        ...provided,
        backgroundColor: groupHeadingBg,
        padding: "8px 12px",
        // make Header look like normal options:
        fontSize: "inherit",
        fontWeight: "inherit"
      }),
      option: (provided) => ({
        ...provided,
        backgroundColor: "inherit",
        _focus: {
          backgroundColor: focussedItemBg
        }
      }),
      dropdownIndicator: (provided) => ({
        ...provided,
        display: "none"
        // always hide
      })
    };
    return chakraStyles;
  }, [groupHeadingBg, focussedItemBg]);
}
function useController(sources, searchTypingDelay, maxResultsPerGroup, map) {
  const [controller, setController] = useState(void 0);
  useEffect(() => {
    if (!map) {
      return;
    }
    const controller2 = new SearchController(map, sources);
    setController(controller2);
    return () => {
      controller2.destroy();
      setController(void 0);
    };
  }, [map, sources]);
  useEffect(() => {
    controller && (controller.searchTypingDelay = searchTypingDelay);
  }, [controller, searchTypingDelay]);
  useEffect(() => {
    controller && (controller.maxResultsPerSource = maxResultsPerGroup);
  });
  return controller;
}
function useSearchState(controller) {
  const [state, dispatch] = useReducer(
    (current, action) => {
      switch (action.kind) {
        case "input":
          return {
            ...current,
            query: action.query,
            selectedOption: null
          };
        case "select-option":
          return {
            ...current,
            selectedOption: action.option,
            query: action.option.label
          };
        case "load-results":
          return {
            ...current,
            search: {
              kind: "loading"
            }
          };
        case "accept-results":
          return {
            ...current,
            search: {
              kind: "ready",
              results: action.results
            }
          };
      }
    },
    void 0,
    () => ({
      query: "",
      selectedOption: null,
      search: {
        kind: "ready",
        results: []
      }
    })
  );
  const currentSearch = useRef();
  const startSearch = useEvent((query) => {
    if (!controller) {
      currentSearch.current = void 0;
      dispatch({ kind: "accept-results", results: [] });
      return;
    }
    LOG.isDebug() && LOG.debug(`Starting new search for query ${JSON.stringify(query)}.`);
    dispatch({ kind: "load-results" });
    const promise = currentSearch.current = search(controller, query).then((results) => {
      if (currentSearch.current === promise) {
        dispatch({ kind: "accept-results", results });
      }
    });
  });
  const onResultConfirmed = useCallback((option) => {
    dispatch({ kind: "select-option", option });
  }, []);
  const onInputChanged = useCallback(
    (newValue) => {
      dispatch({ kind: "input", query: newValue });
      startSearch(newValue);
    },
    [startSearch]
  );
  return {
    input: state.query,
    search: state.search,
    selectedOption: state.selectedOption,
    onResultConfirmed,
    onInputChanged
  };
}
async function search(controller, query) {
  let suggestions;
  try {
    suggestions = await controller.search(query);
  } catch (error) {
    if (!isAbortError(error)) {
      LOG.error(`Search failed`, error);
    }
    suggestions = [];
  }
  return mapSuggestions(suggestions);
}
function mapSuggestions(suggestions) {
  const options = suggestions.map(
    (group, groupIndex) => ({
      label: group.label,
      options: group.results.map((suggestion) => {
        return {
          value: `${groupIndex}-${suggestion.id}`,
          label: suggestion.label,
          source: group.source,
          result: suggestion
        };
      })
    })
  );
  return options;
}

export { Search };
//# sourceMappingURL=Search.js.map
