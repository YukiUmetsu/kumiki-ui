#!/usr/bin/env node
/** Render hero 3D assets from Storybook for visual review (no grading, no CI).
 *
 * Usage (Storybook running on :6006):
 *   npm run hero:capture -- --asset=bull-market
 *   npm run hero:capture -- --asset=bull-market --finish=natural --views=quarter,head
 *   npm run hero:capture -- --asset=cash-stack --action=rain --frames=0,20,40,60,89
 *   npm run hero:capture -- --asset=padlock --views=quarter,front,side,top,close --out=dist/hero-review
 *   npm run hero:capture -- --asset=bank --render=final            (AO, DOF, bloom, 8× supersampling)
 *   npm run hero:capture -- --asset=bank --render='{"quality":"final","bloom":false}' 
 *
 * Writes one PNG per capture and, when ffmpeg is installed, a tiled contact
 * sheet. Views: front, quarter, side, back, top, low, close (zoom 2.6 on the
 * bounds center) or az:el:zoom triplets such as 60:8:3.
 */
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const m = /^--([a-z-]+)=(.*)$/.exec(arg);
  if (!m) throw new Error("Unexpected argument " + arg + ". Use --name=value.");
  return [m[1], m[2]];
}));
if (!args.asset) throw new Error("--asset=<hero kind> is required (see the 3D asset toolkit/Hero Asset Lab story for kinds).");
const port = Number(args.port ?? 6006);
const out = resolve(args.out ?? "dist/hero-capture");
const story = args.story ?? "craft-hero-asset-lab--lab";
const VIEWS = {
  front: [0, 8, 1], quarter: [32, 12, 1], side: [90, 6, 1], back: [180, 12, 1],
  top: [20, 62, 1], low: [35, -4, 1.1], close: [40, 8, 2.6],
};
const views = (args.views ?? (args.action ? "quarter" : "quarter,front,side,close")).split(",").map(v => {
  if (VIEWS[v]) return { name: v, az: VIEWS[v][0], el: VIEWS[v][1], zoom: VIEWS[v][2] };
  const [az, el, zoom] = v.split(":").map(Number);
  if (![az, el, zoom].every(Number.isFinite)) throw new Error("Unknown view " + v);
  return { name: `az${az}-el${el}-z${zoom}`, az, el, zoom };
});
const frames = args.action ? (args.frames ?? "0,15,30,45,60").split(",").map(Number) : [0];
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const files = [];
try {
  const page = await browser.newPage({ viewport: { width: 1300, height: 760 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  for (const view of views) for (const frame of frames) {
    const q = new URLSearchParams({ id: story, viewMode: "story", kmHero: args.asset, kmAz: view.az, kmEl: view.el, kmZoom: view.zoom });
    if (args.finish) q.set("kmFinish", args.finish);
    if (args.target) q.set("kmTarget", args.target);
    if (args.render) q.set("kmRender", args.render === "final" ? JSON.stringify({ quality: "final" }) : args.render);
    if (args.action) { q.set("kmAction", args.action); q.set("kmActionFrame", String(frame)); }
    await page.goto(`http://127.0.0.1:${port}/iframe.html?${q}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas[data-km-hero-ready], [role=alert]", { timeout: 120000 });
    if (await page.locator("[role=alert]").count()) throw new Error(await page.locator("[role=alert]").innerText());
    await page.waitForTimeout(300);
    const name = [args.asset, args.finish, args.render && "r" + (files.length + 1), view.name, args.action && `${args.action}-f${String(frame).padStart(3, "0")}`].filter(Boolean).join("-") + ".png";
    await page.locator("[data-km-video-capture]").screenshot({ path: join(out, name) });
    files.push(name);
    process.stdout.write(`captured ${name}\n`);
  }
  if (errors.length) process.stdout.write("page errors:\n" + [...new Set(errors)].join("\n") + "\n");
} finally { await browser.close(); }
const ffmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
if (ffmpeg.status === 0 && files.length > 1) {
  const columns = Math.min(files.length, args.action ? 5 : 4), rows = Math.ceil(files.length / columns);
  const sheet = join(out, `${args.asset}${args.finish ? "-" + args.finish : ""}${args.action ? "-" + args.action : ""}-sheet.jpg`);
  const inputs = files.flatMap(f => ["-i", join(out, f)]);
  const scaled = files.map((_, i) => `[${i}:v]scale=640:360[v${i}]`).join(";");
  const pad = files.length < columns * rows ? `;color=c=0x111418:s=640x360:d=1[blank]` : "";
  const cells = files.map((_, i) => `[v${i}]`).join("") + (pad ? "[blank]".repeat(columns * rows - files.length) : "");
  const layout = Array.from({ length: columns * rows }, (_, i) => `${(i % columns) * 640}_${Math.floor(i / columns) * 360}`).join("|");
  const graph = `${scaled}${pad};${cells}xstack=inputs=${columns * rows}:layout=${layout}`;
  const result = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", graph, "-frames:v", "1", "-q:v", "3", sheet], { encoding: "utf8" });
  process.stdout.write(result.status === 0 ? `contact sheet: ${sheet}\n` : `ffmpeg failed: ${result.stderr}\n`);
}
