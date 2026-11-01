#!/usr/bin/env node
/* global document, HTMLCanvasElement, HTMLInputElement, requestAnimationFrame */
/** Reproducible, opt-in Storybook image receipts for procedural environments.
 * Does not judge realism or create hero approval records.
 *
 * Start `npm run storybook` separately, then `npm run craft:review`.
 * Offline planning: `npm run craft:review -- --plan`.
 */
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createCraftReviewPlan } from "./craft-review-plan.mjs";

const { plan, port, out, dryRun } = createCraftReviewPlan(process.argv.slice(2));

if (dryRun) {
  process.stdout.write(`${JSON.stringify({ captureCount: plan.length, plan }, null, 2)}\n`);
  process.exit(0);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const baseDir = resolve(out);
const directory = join(baseDir, timestamp);

const waitForRender = async (page, entry) => {
  await page.waitForFunction(target => {
    const story = document.querySelector("[data-km-craft-environment]");
    const root = document.querySelector("[data-km-camera-viewport-3d]");
    const canvas = root?.querySelector("canvas");
    if (document.querySelector('[role="alert"]')) return true;
    const street = target.scene === "street";
    const masonryDetail = target.scene === "masonry";
    const rooms = ["detailed", "no-streetscape", "no-masonry", "no-treatments"].includes(target.mode);
    const pavement = ["detailed", "no-rooms", "no-masonry", "no-treatments"].includes(target.mode);
    const masonry = target.mode !== "no-masonry";
    const treatments = target.mode !== "no-treatments";
    return story?.getAttribute("data-review-scene") === target.scene &&
      story?.getAttribute("data-review-aspect") === target.aspect &&
      story?.getAttribute("data-review-seed") === String(target.seed) &&
      (!street || (story?.getAttribute("data-review-rooms") === (rooms ? "on" : "off") &&
        story?.getAttribute("data-review-streetscape") === (pavement ? "on" : "off") &&
        story?.getAttribute("data-review-masonry") === (masonry ? "on" : "off") &&
        story?.getAttribute("data-review-treatments") === (treatments ? "on" : "off"))) &&
      (!masonryDetail || story?.getAttribute("data-review-masonry") === (target.mode === "bonded" ? "on" : "off")) &&
      (target.scene !== "windows" || story?.getAttribute("data-review-window-mode") === target.mode) &&
      root?.getAttribute("data-camera-frame") === String(target.frame) &&
      canvas instanceof HTMLCanvasElement && canvas.width >= 640 && canvas.height >= 360;
  }, entry, { timeout: 60000 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const error = page.locator('[role="alert"]');
  if (await error.count()) throw new Error(`Scene reported a rendering failure: ${await error.first().innerText()}`);
};
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const pngSize = bytes => {
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
    throw new Error("Capture did not produce a PNG.");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};
const nameFor = entry => `${entry.scene}-${entry.mode}-${entry.aspect}-s${entry.seed}-f${String(entry.frame).padStart(3, "0")}.png`;
const setRange = (page, label, value) => page.getByLabel(label, { exact: true }).evaluate((input, nextValue) => {
  if (!(input instanceof HTMLInputElement) || input.type !== "range")
    throw new Error("Expected a range input.");
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!setter) throw new Error("Range setter unavailable.");
  setter.call(input, String(nextValue));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}, value);
const setStreetFeatures = async (page, mode) => {
  const rooms = ["detailed", "no-streetscape", "no-masonry", "no-treatments"].includes(mode);
  const streetscape = ["detailed", "no-rooms", "no-masonry", "no-treatments"].includes(mode);
  const masonry = mode !== "no-masonry";
  const treatments = mode !== "no-treatments";
  const entries = [["Recessed room geometry", rooms], ["Crafted streetscape (road, sidewalk, lamps)", streetscape],
    ["Running-bond masonry", masonry], ["Window treatments", treatments]];
  for (const [label, enabled] of entries) {
    const control = page.getByLabel(label, { exact: true });
    if (enabled) await control.check(); else await control.uncheck();
  }
};
const storyIdFor = scene => ({ street: "street-corner", hillside: "hillside",
  masonry: "masonry-detail", streetlamp: "streetlamp-detail", windows: "window-detail" })[scene];
const setSceneFeatures = async (page, entry) => {
  if (entry.scene === "street") await setStreetFeatures(page, entry.mode);
  if (entry.scene === "masonry") {
    const masonry = page.getByLabel("Running-bond masonry", { exact: true });
    if (entry.mode === "bonded") await masonry.check(); else await masonry.uncheck();
  }
  if (entry.scene === "windows")
    await page.getByLabel("Window interiors", { exact: true }).selectOption(entry.mode);
};
const receipts = [], seekChecks = [], pageErrors = [];
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.KUMIKI_CHROME_EXECUTABLE
    ? { executablePath: process.env.KUMIKI_CHROME_EXECUTABLE } : {}) });
} catch (error) {
  throw new Error(`A Playwright Chromium binary is required for real WebGL screenshots. Run 'npx playwright install chromium' on the render machine, or configure KUMIKI_CHROME_EXECUTABLE. Original error: ${error.message}`);
}
await mkdir(baseDir, { recursive: true });
await mkdir(directory); // unique output: never overwrite previously reviewed PNGs
let captureFailure = null;
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 2400 }, deviceScaleFactor: 1 });
  page.on("pageerror", error => pageErrors.push(error.message));
  let lastStory = "";
  for (const entry of plan) {
    if (entry.scene !== lastStory) {
      const storyId = `craft-procedural-environments--${storyIdFor(entry.scene)}`;
      const url = `http://127.0.0.1:${port}/iframe.html?id=${storyId}&viewMode=story`;
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      if (!response?.ok()) throw new Error(`Storybook did not serve ${url} (HTTP ${response?.status() ?? "no response"}).`);
      await page.locator("[data-km-camera-viewport-3d] canvas").waitFor({ timeout: 90000 });
      lastStory = entry.scene;
    }
    await page.getByLabel("Output aspect", { exact: true }).selectOption(entry.aspect);
    await setRange(page, "Seed", entry.seed);
    await setSceneFeatures(page, entry);
    await setRange(page, "Camera frame", entry.frame);
    await waitForRender(page, entry);
    if (pageErrors.length) throw new Error(`Browser page exception: ${pageErrors.join(" | ")}`);
    const canvas = page.locator("[data-km-camera-viewport-3d] canvas");
    const filename = nameFor(entry);
    const bytes = await canvas.screenshot({ path: join(directory, filename), animations: "disabled" });
    const dimensions = pngSize(bytes);
    const intended = entry.aspect === "landscape" ? 16 / 9 : 9 / 16;
    if (Math.abs(dimensions.width / dimensions.height - intended) > .013)
      throw new Error(`${filename}: screenshot ratio does not match ${entry.aspect}.`);
    receipts.push({ ...entry, filename, sha256: hash(bytes), ...dimensions });
    process.stdout.write(`captured ${filename} ${dimensions.width}×${dimensions.height}\n`);
  }

  // Reverse-seeking back to the first frame of each configuration checks the
  // actual rendered frame, not just an evaluator's return value.
  for (const group of [...new Set(receipts.map(r => `${r.scene}/${r.mode}/${r.aspect}/${r.seed}`))]) {
    const captures = receipts.filter(r => `${r.scene}/${r.mode}/${r.aspect}/${r.seed}` === group);
    if (captures.length < 2) continue;
    const first = captures[0], last = captures.at(-1);
    const storyId = `craft-procedural-environments--${storyIdFor(first.scene)}`;
    await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${storyId}&viewMode=story`, { waitUntil: "domcontentloaded" });
    await page.locator("[data-km-camera-viewport-3d] canvas").waitFor();
    await page.getByLabel("Output aspect", { exact: true }).selectOption(first.aspect);
    await setRange(page, "Seed", first.seed);
    await setSceneFeatures(page, first);
    await setRange(page, "Camera frame", last.frame);
    await waitForRender(page, last);
    await setRange(page, "Camera frame", first.frame);
    await waitForRender(page, first);
    const repeated = await page.locator("[data-km-camera-viewport-3d] canvas").screenshot({ animations: "disabled" });
    seekChecks.push({ group, referenceFrame: first.frame, matchingSha256: hash(repeated) === first.sha256 });
  }
} catch (error) {
  captureFailure = error instanceof Error ? error.message : String(error);
} finally {
  await browser.close();
}

const report = { kind: "craft-environment-visual-receipt", capturedAt: new Date().toISOString(),
  approval: "unreviewed", renderer: "real-browser-screenshot", expectedCaptures: plan.length,
  captureFailure, receipts, seekChecks, pageErrors };
await writeFile(join(directory, "manifest.json"), `${JSON.stringify(report, null, 2)}\n`);
const safe = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const cards = receipts.map(r => `<figure><img loading="lazy" src="${safe(r.filename)}" alt="${safe(`${r.scene} ${r.mode} ${r.aspect} seed ${r.seed} frame ${r.frame}`)}"/><figcaption>${safe(`${r.scene} · ${r.mode} · ${r.aspect} · seed ${r.seed} · frame ${r.frame}`)}</figcaption></figure>`).join("\n");
const seekStatus = captureFailure || !seekChecks.length ? "not completed" : seekChecks.every(x => x.matchingSha256) ? "all matched" : "differences detected — inspect manifest.json";
await writeFile(join(directory, "index.html"), `<!doctype html><html lang="en"><meta charset="utf-8"/><title>Kumiki Craft Visual Review</title><style>body{background:#131a20;color:#e8edf0;font:16px system-ui;margin:28px}h1{font-size:26px;font-weight:500}p{max-width:750px;color:#b8c6c9;line-height:1.5}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr));gap:22px}figure{margin:0;padding:12px;border:1px solid #42505b;border-radius:9px;background:#1d252d}img{display:block;width:100%;height:auto}figcaption{font-size:13px;margin-top:10px}</style><h1>Kumiki Craft Visual Review</h1><p>Actual Storybook canvas screenshots. <strong>No visual approval is implied.</strong> Compare street ablations, dressed/bare/backed window close-ups, masonry bond, streetlamp detail, camera parallax, glass sorting and material response before a human signs off. Capture status: ${captureFailure ? safe(`FAILED: ${captureFailure}`) : "completed"}. Seek parity: ${seekStatus}.</p><main>${cards}</main></html>\n`);
process.stdout.write(`Review receipts: ${directory}/index.html\n`);
if (captureFailure) {
  process.exitCode = 1;
  process.stderr.write(`Capture failed; partial receipts saved: ${captureFailure}\n`);
}
if (seekChecks.some(check => !check.matchingSha256)) {
  process.exitCode = 1;
  process.stderr.write("Frame seek parity failed; receipts are saved for debugging.\n");
}
