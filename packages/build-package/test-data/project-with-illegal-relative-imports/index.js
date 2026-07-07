import { foo } from "../outside-package";
import { bar } from "./nested/test.js";

void foo;
void bar;
