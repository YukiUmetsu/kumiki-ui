/**
 * RIG1 contact sheet: consecutive frames of one preset motion side by side, for frame-by-frame motion review.
 * Usage: npx jiti scripts/rig-contact-sheet.ts <subject> <motion> <out.png> [first] [count] [step] [look] [--bones] [--follow]
 * Each cell tracks the subject (with --follow) so a gait stays in frame; a fixed ground grid shows slides.
 */
import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { RIG_PRESETS } from "../registry/rig/rig-presets";
import { RigScene, followCamera } from "../registry/rig/rig-react";
import { rootState } from "../registry/rig/rig-evaluate";
import type { RigLook } from "../registry/rig/rig-react";

const [subject = "horse", motion = "gallop", out = "sheet.png", first = "60", count = "16", step = "1", look = "flat", ...flags] = process.argv.slice(2);
const entry = RIG_PRESETS.find(p => p.id === subject)!;
const W = 1600, H = 900, GROUND = 720, D = 240;
const follow = flags.includes("--follow"), bones = flags.includes("--bones");
const air = entry.airborne?.(motion) ?? false, pace = entry.pace?.(motion, entry.size) ?? 0;
const y = air ? 400 : GROUND;
const staged = entry.staged?.(motion);
const from = staged ? (motion === "reverse" ? W * .7 : motion.includes("brake") || motion.includes("stop") ? -entry.size * .8 : motion.startsWith("turn") ? -entry.size * .7 : W / 2) : follow ? 0 : W / 2 - pace * D / 2;
const to = staged ? (motion === "reverse" ? W * .32 : motion.includes("brake") || motion.includes("stop") ? W * .6 : motion.startsWith("turn") ? W + entry.size * .7 : W / 2) : follow ? pace * D : W / 2 + pace * D / 2;
const spec = entry.build({ size: entry.size, motion, start: 0, end: D, y, from, to });
const frames = Array.from({ length: Number(count) }, (_, i) => Number(first) + i * Number(step));
const cells = frames.map(f => {
  const feet = flags.includes("--feet"), zoom = feet ? 4 : flags.includes("--zoom") ? (entry.size < 250 ? 4.5 : 2.2) : 1;
  const camera = follow || zoom > 1 ? followCamera(spec, f, { y: feet ? GROUND - entry.size * .1 : zoom > 1 ? (air ? y : GROUND - entry.size * .4) : H / 2, zoom }) : undefined;
  if (camera && !follow) camera.x = W / 2;
  if (camera && zoom > 1 && air) camera.y = rootState(spec, f).y;
  const svg = renderToStaticMarkup(createElement(RigScene, { look: look as RigLook, width: W, height: H, ground: motion === "turn-away" ? GROUND - entry.size * .5 : GROUND, frame: f, rigs: [spec], camera, showBones: bones }));
  return `<figure><div class="c">${svg}</div><figcaption>${f}</figcaption></figure>`;
});
const big = flags.includes("--big"), cw = big ? 960 : 480, ch = big ? 540 : 270;
const cols = Math.min(big ? 2 : 4, frames.length);
const html = `<!doctype html><html><head><style>body{margin:0;background:#222;font:600 18px system-ui;color:#eee}
.g{display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:6px;padding:6px}figure{margin:0}.c{width:${cw}px;height:${ch}px;overflow:hidden;background:#fff}
figcaption{padding:2px 6px}</style></head><body><div class="g">${cells.join("")}</div></body></html>`;
const htmlPath = out.replace(/\.png$/, ".html");
writeFileSync(htmlPath, html);
void (async () => {
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: cols * (cw + 6) + 6, height: 400 } });
await page.goto("file://" + htmlPath);
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(out);
})();
