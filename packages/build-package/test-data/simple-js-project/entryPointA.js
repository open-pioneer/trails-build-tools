import { log } from "./dir/log";
import something from "somewhere-external";
import somethingElse from "@scope/somewhere-external";
import { useService } from "open-pioneer:react-hooks";

// Use to prevent warnings
console.log(something, somethingElse, useService);

export function helloA() {
    log("hello from entry point A");
}
