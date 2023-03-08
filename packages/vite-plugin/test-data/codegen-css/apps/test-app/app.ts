// File should be .ts to test some edge case behavior related to the eslint loader from vite
// in combination with a self-import for `.scss`.
// We don't have typings here, however:
// @ts-expect-error
import { styles } from "open-pioneer:app";
console.log(styles);
