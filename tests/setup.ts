import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom has no canvas; axe-core probes it for icon-ligature detection and logs
// a "not implemented" error. Stub it so the suite output stays clean.
// Guarded so files that opt into the node environment (for example MathJax in Node) still load this setup.
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = function getContext() {
    return null;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

afterEach(() => {
  cleanup();
});
