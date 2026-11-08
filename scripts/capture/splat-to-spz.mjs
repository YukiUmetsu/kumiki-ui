// Final capture: crop to a box around the subject (in the capture's own coordinates), drop near-invisible splats, keep SH degree 1.
import { readFileSync, writeFileSync } from "node:fs";
const { transcodeSpz } = await import("@sparkjsdev/spark");
const [input, output, cx, cy, cz, half, opacity] = process.argv.slice(2);
const c = [Number(cx), Number(cy), Number(cz)], h = Number(half);
const out = await transcodeSpz({ inputs: [{ fileBytes: new Uint8Array(readFileSync(input)), pathOrUrl: input }], maxSh: 1, opacityThreshold: Number(opacity),
  clipXyz: { min: c.map(v => v - h), max: c.map(v => v + h) } });
writeFileSync(output, out.fileBytes);
console.log("wrote", out.fileBytes.length, "bytes; clipped", out.clippedCount);
