// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { RuntimeSupport } from ".";

describe("parseVirtualModule", function () {
    it("parses virtual modules", function () {
        expect(RuntimeSupport.parseVirtualModule("open-pioneer:react-hooks")).toBe("react-hooks");
        expect(RuntimeSupport.parseVirtualModule("open-pioneer:app")).toBe("app");
        expect(RuntimeSupport.parseVirtualModule("whatever")).toBe(undefined);
        expect(RuntimeSupport.parseVirtualModule("./foo/bar")).toBe(undefined);
    });

    it("throws for unknown modules under the open pioneer prefix", function () {
        expect(() =>
            RuntimeSupport.parseVirtualModule("open-pioneer:foo")
        ).toThrowErrorMatchingInlineSnapshot(`[Error: Unsupported module id 'open-pioneer:foo'.]`);
    });
});

describe("generateReactHooks", function () {
    it("generates react hooks with unresolved id by default", function () {
        const code = RuntimeSupport.generateReactHooks("mypackage-name");
        expect(code).toMatchInlineSnapshot(`
          "import { useServiceInternal, useServicesInternal, usePropertiesInternal, useIntlInternal } from "@open-pioneer/runtime/react-integration";

          const PACKAGE_NAME = "mypackage-name";
          export const useService = /*@__PURE__*/ useServiceInternal.bind(undefined, PACKAGE_NAME);
          export const useServices = /*@__PURE__*/ useServicesInternal.bind(undefined, PACKAGE_NAME);
          export const useProperties = /*@__PURE__*/ usePropertiesInternal.bind(undefined, PACKAGE_NAME);
          export const useIntl = /*@__PURE__*/ useIntlInternal.bind(undefined, PACKAGE_NAME);"
        `);
    });

    it("generates react hooks with custom id when specified", function () {
        const code = RuntimeSupport.generateReactHooks(
            "mypackage-name",
            "custom-react-hooks-id/a/b/c"
        );
        expect(code).toMatchInlineSnapshot(`
          "import { useServiceInternal, useServicesInternal, usePropertiesInternal, useIntlInternal } from "custom-react-hooks-id/a/b/c";

          const PACKAGE_NAME = "mypackage-name";
          export const useService = /*@__PURE__*/ useServiceInternal.bind(undefined, PACKAGE_NAME);
          export const useServices = /*@__PURE__*/ useServicesInternal.bind(undefined, PACKAGE_NAME);
          export const useProperties = /*@__PURE__*/ usePropertiesInternal.bind(undefined, PACKAGE_NAME);
          export const useIntl = /*@__PURE__*/ useIntlInternal.bind(undefined, PACKAGE_NAME);"
        `);
    });
});
