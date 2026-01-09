import { logSourceId as sourceIdOutSidePackage } from "../../log";
import { Component } from "./Component";

// Ensure components are not optimized out
console.log(Component);

sourceIdOutSidePackage();
