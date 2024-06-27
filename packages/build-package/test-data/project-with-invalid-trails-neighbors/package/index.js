import { A } from "package-a/exists-but-not-an-entry-point";
import { B } from "package-a/does-not-exist-at-all";
import { C } from "package-a/my-services";
console.log(A, B, C);
