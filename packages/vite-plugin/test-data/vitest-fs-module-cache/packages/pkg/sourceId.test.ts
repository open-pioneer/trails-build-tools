import { expect, it } from "vitest";
import { getSourceId } from "./sourceId";

it("provides the source id", () => {
    expect(getSourceId()).toBe("pkg/sourceId");
});
