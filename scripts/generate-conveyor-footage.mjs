#!/usr/bin/env node
/* global document */
/** Regenerates src/video/assets/conveyor-1080p.webm: the conveyor scene from
 * src/video/conveyor-scene.ts rendered frame by frame in headless Chromium and encoded
 * with FFmpeg (VP9). In-house footage with exact, known geometry for FreezeFrameFocus demos.
 * Usage: node scripts/generate-conveyor-footage.mjs   (needs Playwright Chromium + ffmpeg)
 *        node scripts/generate-conveyor-footage.mjs --still=90
 *          → src/visual/assets/conveyor-still-90-4k.jpg (3840×2160, same scene, for EvidenceStage)
 */
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { CONVEYOR_DESIGN, createConveyorDrawer } from "../src/video/conveyor-scene.ts";

const still = process.argv.slice(2).map(a => /^--still=(\d+)$/.exec(a)?.[1]).find(Boolean);
const WIDTH = still ? 3840 : 1920, HEIGHT = still ? 2160 : 1080;
const output = resolve(still ? `src/visual/assets/conveyor-still-${still}-4k.jpg` : "src/video/assets/conveyor-1080p.webm");
const run = (bin, args) => new Promise((ok, fail) => {
  const proc = spawn(bin, args, { stdio: "inherit" });
  proc.once("error", fail);
  proc.once("close", code => code === 0 ? ok() : fail(new Error(`${bin} exited with ${code}`)));
});
const temp = await mkdtemp(join(tmpdir(), "kumiki-conveyor-"));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(`<canvas id="c" width="${WIDTH}" height="${HEIGHT}"></canvas>`);
  const frames = still ? [Number(still)] : Array.from({ length: CONVEYOR_DESIGN.frames }, (_, f) => f);
  for (const frame of frames) {
    const png = await page.evaluate(({ source, frame, width, height }) => {
      const draw = new Function(`return (${source})()`)();
      const canvas = document.getElementById("c");
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);
      draw(ctx, width, height, frame);
      return canvas.toDataURL("image/png").split(",")[1];
    }, { source: createConveyorDrawer.toString(), frame, width: WIDTH, height: HEIGHT });
    await writeFile(join(temp, `f-${String(frame).padStart(4, "0")}.png`), Buffer.from(png, "base64"));
  }
  if (still) await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", join(temp, `f-${String(still).padStart(4, "0")}.png`), "-q:v", "3", output]);
  else await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-framerate", "30", "-i", join(temp, "f-%04d.png"),
    "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "34", "-g", "15", "-row-mt", "1", "-pix_fmt", "yuv420p", "-an", output]);
  process.stdout.write(`Wrote ${output} (${frames.length} frame${frames.length > 1 ? "s" : ""}, ${WIDTH}×${HEIGHT})\n`);
} finally {
  await browser.close();
  await rm(temp, { recursive: true, force: true });
}
