import { jsx, jsxs } from 'react/jsx-runtime';
import { ArrowRightIcon, ArrowLeftIcon } from '@chakra-ui/icons';
import { useDisclosure, Button, Tooltip, IconButton, Flex, Box, Spacer, CloseButton } from '@open-pioneer/chakra-integration';
import { useIntl } from './_virtual/_virtual-pioneer-module_react-hooks.js';
import { useEffect, useReducer, useCallback } from 'react';

const mainSidebarWidthCollapsed = 60;
const mainSidebarWidthExpanded = 180;
const contentSidebarWidth = 300;
function Sidebar({
  defaultExpanded,
  expandedChanged,
  sidebarWidthChanged,
  items
}) {
  const intl = useIntl();
  const [selectedItems, { toggle: toggleItem }] = useSelection(items);
  const { isOpen: isMainToggled, onToggle: toggleMain } = useDisclosure({
    defaultIsOpen: defaultExpanded,
    onOpen() {
      expandedChanged?.(true);
    },
    onClose() {
      expandedChanged?.(false);
    }
  });
  const { isOpen: isContentToggled, onToggle: toggleContent } = useDisclosure();
  const hasSelectedItems = selectedItems.size > 0;
  useEffect(() => {
    if (hasSelectedItems && !isContentToggled) {
      toggleContent();
    }
    if (!hasSelectedItems && isContentToggled) {
      toggleContent();
    }
  }, [hasSelectedItems]);
  useEffect(() => {
    if (sidebarWidthChanged) {
      let width = mainSidebarWidthCollapsed;
      if (isMainToggled) {
        width = mainSidebarWidthExpanded;
      }
      if (isContentToggled) {
        width += contentSidebarWidth;
      }
      sidebarWidthChanged(width);
    }
  }, [isMainToggled, isContentToggled]);
  const sidebarButtons = items?.map((item, idx) => {
    const color = "white";
    const variant = selectedItems.has(item.id) ? "outline" : "ghost";
    return /* @__PURE__ */ jsx("div", { children: isMainToggled ? /* @__PURE__ */ jsx(
      Button,
      {
        leftIcon: item.icon,
        variant,
        colorScheme: color,
        onClick: () => toggleItem(item),
        children: item.label
      },
      item.id
    ) : /* @__PURE__ */ jsx(Tooltip, { hasArrow: true, label: item.label, placement: "right", children: /* @__PURE__ */ jsx(
      IconButton,
      {
        "aria-label": item.label,
        variant,
        colorScheme: color,
        icon: item.icon,
        onClick: () => toggleItem(item)
      }
    ) }, item.id) }, idx);
  });
  const content = items?.filter((item) => selectedItems.has(item.id)).map((item) => {
    return /* @__PURE__ */ jsxs("div", { className: "content-section", children: [
      /* @__PURE__ */ jsxs(Flex, { className: "content-header", alignItems: "center", children: [
        /* @__PURE__ */ jsx(Box, { children: item.label }),
        /* @__PURE__ */ jsx(Spacer, {}),
        /* @__PURE__ */ jsx(CloseButton, { onClick: () => toggleItem(item) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "content-body", children: item.content })
    ] }, item.id);
  });
  const toggleButtonLabel = intl.formatMessage({
    id: isMainToggled ? "toggle.collapse" : "toggle.expand"
  });
  return /* @__PURE__ */ jsxs(Flex, { className: "layout-sidebar", children: [
    /* @__PURE__ */ jsxs(
      Box,
      {
        className: "layout-sidebar-main",
        display: "flex",
        flexDirection: "column",
        width: !isMainToggled ? `${mainSidebarWidthCollapsed}px` : `${mainSidebarWidthExpanded}px`,
        padding: "10px",
        gap: "10px",
        children: [
          sidebarButtons,
          /* @__PURE__ */ jsx(Spacer, {}),
          /* @__PURE__ */ jsx(Tooltip, { label: toggleButtonLabel, hasArrow: true, placement: "right", children: /* @__PURE__ */ jsx(
            IconButton,
            {
              "aria-label": toggleButtonLabel,
              variant: "ghost",
              icon: !isMainToggled ? /* @__PURE__ */ jsx(ArrowRightIcon, {}) : /* @__PURE__ */ jsx(ArrowLeftIcon, {}),
              onClick: toggleMain
            }
          ) })
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      Box,
      {
        className: "layout-sidebar-content",
        width: !isContentToggled ? `${0}px` : `${contentSidebarWidth}px`,
        children: content
      }
    )
  ] });
}
function useSelection(items) {
  const [selected, dispatch] = useReducer(
    (state, action) => {
      switch (action.type) {
        case "toggle": {
          const newState = new Set(state);
          if (newState.has(action.id)) {
            newState.delete(action.id);
          } else {
            newState.add(action.id);
          }
          return newState;
        }
        case "retain": {
          const allIds = new Set(action.ids);
          const newState = new Set(state);
          for (const id of newState) {
            if (!allIds.has(id)) {
              newState.delete(id);
            }
          }
          return newState;
        }
      }
    },
    void 0,
    () => /* @__PURE__ */ new Set()
  );
  const toggle = useCallback(
    (item) => {
      dispatch({ type: "toggle", id: item.id });
    },
    [dispatch]
  );
  useEffect(() => {
    dispatch({ type: "retain", ids: items?.map((item) => item.id) ?? [] });
  }, [items, dispatch]);
  return [selected, { toggle }];
}

export { Sidebar };
//# sourceMappingURL=Sidebar.js.map
