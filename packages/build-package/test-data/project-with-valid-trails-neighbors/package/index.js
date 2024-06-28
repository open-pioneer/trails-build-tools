// all of these are entry points
import { A } from "package-a";
import { MAIN } from "package-b";
import { OTHER } from "package-b/other-entry";
import { NESTED } from "package-b/nested";
console.log(A, MAIN, OTHER, NESTED);
