#!/usr/bin/env node
/** Opt-in, local-only RAG MP4 export. Browser captures frames; FFmpeg encodes.
 * No browser install, TTS, GPU inference or screen-recognition in CI.
 *
 * Usage:
 *   node scripts/export-rag-video.mjs
 *   node scripts/export-rag-video.mjs --output=dist/rag.mp4 --frames=90
 *   node scripts/export-rag-video.mjs --audio=/path/to/narration.wav
 */
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { chromium } from "playwright";

const FPS = 30;
const TOTAL = 1080;
const PORT = 6006;
const HOST = "http://127.0.0.1:" + PORT;
const STORY = HOST + "/iframe.html?id=explainers-what-is-rag--complete-explainer&viewMode=story&ragExport=1";

const option = (name, fallback) =>
  process.argv.find(argument => argument.startsWith("--" + name + "="))
    ?.slice(name.length + 3) ?? fallback;
const output = resolve(option("output", "dist/rag-explainer.mp4"));
const audio = option("audio", "");
const requestedFrames = Number(option("frames", String(TOTAL)));
if (!Number.isSafeInteger(requestedFrames) || requestedFrames < 1 || requestedFrames > TOTAL) {
  throw new Error("--frames must be an integer from 1 to 1080.");
}
const wait = (ms) => new Promise(res => setTimeout(res, ms));
const available = async (url) => {
  try { const response = await fetch(url, { signal: AbortSignal.timeout(1500) }); return response.ok; }
  catch { return false; }
};
const execute = (command, args) => new Promise((resolveRun, reject) => {
  const child = spawn(command, args, { stdio: "inherit" });
  child.once("error", reject);
  child.once("exit", code => code === 0
    ? resolveRun() : reject(new Error(command + " failed with code " + code + ".")));
});

let server;
let browser;
const frames = await mkdtemp(join(tmpdir(), "kumiki-rag-frames-"));
try {
  if (!await available(STORY)) {
    const executable = process.platform === "win32" ? "node_modules/.bin/storybook.cmd" : "node_modules/.bin/storybook";
    server = spawn(executable, ["dev", "-p", String(PORT), "--host", "127.0.0.1", "--ci"], { stdio: "ignore" });
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (server.exitCode !== null) throw new Error("Storybook exited before the RAG story became available.");
      if (await available(STORY)) { ready = true; break; }
      await wait(1000);
    }
    if (!ready) throw new Error("Storybook did not serve the RAG capture story at " + STORY + ".");
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1820, height: 1100 },
    deviceScaleFactor: 1, reducedMotion: "no-preference" });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(STORY, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => typeof window.__kmRagSeekFrame === "function",
    null, { timeout: 60_000 });
  const canvas = page.locator("[data-km-explainer-frame-capture]");
  await canvas.waitFor();
  for (let frame = 0; frame < requestedFrames; frame++) {
    if (pageErrors.length) throw new Error("RAG browser error: " + pageErrors.join("; "));
    await page.evaluate(async index => {
      await window.__kmRagSeekFrame(index);
    }, frame);
    await canvas.screenshot({
      path: join(frames, "frame-" + String(frame).padStart(5, "0") + ".png"),
      animations: "disabled", caret: "hide", timeout: 30_000,
    });
    if (frame % 90 === 0 || frame === requestedFrames - 1) {
      process.stdout.write("Captured frame " + (frame + 1) + " / " + requestedFrames + "\n");
    }
  }
  await mkdir(dirname(output), { recursive: true });
  const args = ["-nostdin", "-y", "-framerate", String(FPS),
    "-i", join(frames, "frame-%05d.png")];
  if (audio) args.push("-i", resolve(audio));
  args.push("-c:v", "libx264", "-crf", "19", "-preset", "medium",
    "-pix_fmt", "yuv420p", "-r", String(FPS), "-t", String(requestedFrames / FPS));
  if (audio) args.push("-c:a", "aac", "-b:a", "192k");
  else args.push("-an");
  args.push("-movflags", "+faststart", output);
  await execute("ffmpeg", args);
  process.stdout.write("Video exported: " + output + "\n");
} finally {
  if (browser) await browser.close();
  if (server) server.kill("SIGTERM");
  await rm(frames, { recursive: true, force: true });
}
