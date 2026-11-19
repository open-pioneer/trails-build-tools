import { expect, inject, it } from "vitest";

it("serves the public assets of the package", async () => {
    // The node environment has no window, but open-pioneer:deployment reads window.origin.
    Object.assign(globalThis, { window: { origin: inject("serverOrigin") } });
    const { getPublicAssetUrl } = await import("open-pioneer:assets");

    const response = await fetch(getPublicAssetUrl("hello.txt"));
    expect(response.status).toBe(200);

    const content = await response.text();
    expect(content).toBe("hello\n");
});
