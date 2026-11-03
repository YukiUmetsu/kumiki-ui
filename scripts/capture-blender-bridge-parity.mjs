#!/usr/bin/env node
/** Manual, local-only Three.js silhouette capture against a portable Blender plan.
 * Storybook and Chromium must already be available. Never a CI screenshot gate.
 */
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";

const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const args = process.argv.slice(2);
function argument(flag, fallback) {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`Missing value for ${flag}`);
  return args[index + 1];
}
const planFile = resolve(argument("--plan", "src/craft/fixtures/blender-rotational-impacts/visual-parity-plan.json"));
const modelFile = resolve(argument("--model", join(dirname(planFile), "model.glb")));
const out = resolve(argument("--output", "./.review/bridge-parity-web"));
const baseUrl = argument("--storybook", "http://127.0.0.1:6006");
const dryRun = args.includes("--dry-run");
const unexpected = args.filter((token, i) => token.startsWith("--") && !["--plan", "--model", "--output", "--storybook", "--executable", "--dry-run"].includes(token));
if (unexpected.length) throw new Error(`Unknown arguments: ${unexpected.join(", ")}`);
const planBytes = await readFile(planFile);
const plan = JSON.parse(planBytes.toString("utf8"));
if (plan.schema_version !== 1 || !/^[a-zA-Z0-9._-]+$/.test(plan.story_id ?? "") ||
    !/^[a-zA-Z0-9._-]+$/.test(plan.action_id ?? "") ||
    !Array.isArray(plan.frames) || plan.frames.length < 1 || plan.frames.length > 24 ||
    plan.frames.some((frame, i) => !Number.isSafeInteger(frame) || frame < 0 || (i && frame <= plan.frames[i - 1])) ||
    !Number.isSafeInteger(plan.width) || !Number.isSafeInteger(plan.height) ||
    plan.width < 64 || plan.width > 4096 || plan.height < 64 || plan.height > 4096 ||
    plan.width * plan.height > 8_388_608 || !/^[a-f0-9]{64}$/.test(plan.model_sha256 ?? ""))
  throw new Error("Invalid bridge parity capture plan");
const modelDigest = sha(await readFile(modelFile));
if (modelDigest !== plan.model_sha256) throw new Error("GLB hash disagrees with parity plan; regenerate the plan");
const url = new URL("/iframe.html", baseUrl);
url.searchParams.set("id", plan.story_id);
url.searchParams.set("viewMode", "story");
url.searchParams.set("kmSilhouette", "1");
if (dryRun) {
  process.stdout.write(JSON.stringify({ url: String(url), output: out, model_sha256: modelDigest,
    plan_sha256: sha(planBytes), frames: plan.frames, dimensions: [plan.width, plan.height] }, null, 2) + "\n");
  process.exit(0);
}
try { await stat(out); throw new Error(`Capture output already exists: ${out}`); }
catch (error) { if (error.code !== "ENOENT") throw error; }

const { chromium } = await import("playwright");
const executablePath = argument("--executable", process.env.KUMIKI_BROWSER_EXECUTABLE);
const browser = await chromium.launch({ headless: true,
  ...(executablePath ? { executablePath } : {}),
  args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1050 }, deviceScaleFactor: 1 });
  await page.goto(String(url), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(expected => {
    const input = document.querySelector("input[data-km-parity-seek]");
    const root = document.querySelector("[data-km-parity-action]");
    const canvas = document.querySelector("canvas[data-km-hero-ready='true']");
    return !!input && root?.getAttribute("data-km-parity-action") === expected.action &&
      !!canvas && canvas.width === expected.width && canvas.height === expected.height;
  }, { action: plan.action_id, width: plan.width, height: plan.height }, { timeout: 60000 });
  await mkdir(dirname(out), { recursive: true });
  await mkdir(out, { recursive: false });
  const files = {};
  for (const frame of plan.frames) {
    await page.locator("input[data-km-parity-seek]").evaluate((input, value) => {
      if (!(input instanceof HTMLInputElement) || input.type !== "range") throw new Error("Missing frame seek input");
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (!setter) throw new Error("Cannot seek controlled range input");
      setter.call(input, String(value));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, frame);
    await page.waitForFunction(value => {
      const canvas = document.querySelector("canvas[data-km-hero-ready='true']");
      return !!canvas && canvas.getAttribute("data-km-hero-frame") === String(value);
    }, frame, { timeout: 15000 });
    const dataUrl = await page.locator("canvas[data-km-hero-ready='true']").evaluate(async canvas => {
      await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
      return canvas.toDataURL("image/png");
    });
    if (!dataUrl.startsWith("data:image/png;base64,")) throw new Error(`WebGL did not return PNG for frame ${frame}`);
    const data = Buffer.from(dataUrl.split(",")[1], "base64");
    if (data.readUInt32BE(16) !== plan.width || data.readUInt32BE(20) !== plan.height)
      throw new Error(`WebGL canvas dimensions changed at frame ${frame}`);
    const name = `frame-${String(frame).padStart(5, "0")}.png`;
    await writeFile(join(out, name), data, { flag: "wx" });
    files[name] = sha(data);
  }
  const receipt = { schema_version: 1, renderer: "kumiki-webgl", plan_sha256: sha(planBytes),
    model_sha256: modelDigest, frames: plan.frames, width: plan.width, height: plan.height, files };
  await writeFile(join(out, "capture.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  process.stdout.write(`KUMIKI_BRIDGE_PARITY_WEB_OK ${out}\n`);
} finally { await browser.close(); }
