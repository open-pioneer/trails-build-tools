import { PACKAGE_EXPORT as INDEX_EXPORT } from "package-with-index";
import { PACKAGE_EXPORT as MAIN_EXPORT } from "package-with-main";
import { PACKAGE_EXPORT as EXPORTS_EXPORT_1 } from "package-with-exports";
import { PACKAGE_EXPORT as EXPORTS_EXPORT_2 } from "package-with-exports/other-entry";

console.log(INDEX_EXPORT, MAIN_EXPORT, EXPORTS_EXPORT_1, EXPORTS_EXPORT_2);
