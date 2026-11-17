#!/usr/bin/env node
/** Generate an ANAT1 construction guide, not a source-matched or finished portrait.
 * Usage: node scripts/anatomy/face-projection-study.mjs <output-directory>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = process.argv[2];
if (!output || process.argv.length !== 3) throw Error("Give an output directory: node scripts/anatomy/face-projection-study.mjs <output-directory>");
const server = await createServer({ root, configFile: false, appType: "custom", logLevel: "error",
  cacheDir: "node_modules/.vite-anatomy-study", server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
try {
  const { createFace, faceFeatureLines } = await server.ssrLoadModule("/registry/anatomy/anatomy-face.ts");
  const { renderMeshFrame, rasterizeHumanFrame } = await server.ssrLoadModule("/registry/anatomy/anatomy-view.ts");
  // Keep the canonical mask; population calibration is not an observation of either royal actor.
  const face = createFace({ calibrate: false });
  const tones = { highlight: "#f6e5ca", light: "#e4c4a6", halftone: "#c89b7f", core: "#997260", shadow: "#6c4c43" };
  const views = [-75, -45, 0, 45, 75].map((yaw, index) => {
    const frame = renderMeshFrame(face.mesh, { yaw, pitch: 0 }, { width: 280, height: 320, padding: 20 });
    const depth = rasterizeHumanFrame(frame, "silhouette", { light: [255,255,255], shadow: [0,0,0], eye: [255,255,255] }, 2);
    const point = n => `${frame.screen[n * 3].toFixed(2)},${frame.screen[n * 3 + 1].toFixed(2)}`;
    const surface = frame.triangles.map(t => `<path d="M${point(t.a)} L${point(t.b)} L${point(t.c)}Z" fill="${tones[t.band]}"/>`).join("");
    const lines = faceFeatureLines(frame, undefined, { depth: depth.depth, width: depth.width, height: depth.height }).map(line => `<polyline data-anat1-feature="${line.id}" points="${line.points.map(p => p.map(v => v.toFixed(2)).join(",")).join(" ")}" fill="none" stroke="#492f2c" stroke-width="1"/>`).join("");
    return `<g transform="translate(${index * 280} 40)">${surface}${lines}</g><text x="${index * 280 + 140}" y="28" text-anchor="middle" font-family="sans-serif" font-size="16">yaw ${yaw}°</text>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="360" viewBox="0 0 1400 360"><rect width="1400" height="360" fill="#e8ece7"/>${views.join("")}</svg>`;
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, "anat1-face-projections.svg"), svg);
  console.log(`ANAT1 construction guide written to ${resolve(output, "anat1-face-projections.svg")}; this is not a portrait fidelity review.`);
} finally { await server.close(); }
