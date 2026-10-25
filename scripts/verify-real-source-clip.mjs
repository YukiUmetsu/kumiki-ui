#!/usr/bin/env node
/* global document, window */
/** Real-source verifier (K1). Opens each generated fixture in Chrome through the Real Source Clip story, seeks
 * every output frame in a seeded shuffled order using the export seek protocol, and reads the source-frame
 * barcode back from the canvas that was drawn. A frame passes only if the decoded index equals the expected
 * source frame, and only frames reported ready or inexact are compared at all.
 *
 *   node scripts/verify-real-source-clip.mjs --base=http://127.0.0.1:6007 --fixtures=<dir> [--clips=a] [--seed=1] [--browser=chrome|chromium] [--exported=<file.mp4>]
 * --exported decodes an exported MP4 of the single selected clip and checks each output frame's barcode.
 *
 * Requires a static Storybook build containing the story, with the fixture media and metadata copied to <base>/k1/.
 * Serve it with scripts/serve-static.mjs: a server without HTTP Range support cannot seek inside MP4 files.
 * Prints a JSON report; exits 1 if any fixture shows a wrong frame as ready or inexact, or fails its own checks.
 */
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { BARCODE_BITS, barcodeLayout, expectedSourceFrame } from "./real-source-fixtures.mjs";
import { probeClipSource } from "./probe-clip-source.mjs";

const OUT_FPS = { num: 30, den: 1 };
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const match = /^--([\w]+)=(.+)$/.exec(arg);
  if (!match) throw new Error("Unknown argument: " + arg);
  return [match[1], match[2]];
}));
if (!args.fixtures) throw new Error("Specify --fixtures=<directory produced by generate-real-source-fixtures>.");
const base = (args.base ?? "http://127.0.0.1:6007").replace(/\/$/, "");
const fixtures = resolve(args.fixtures);
const seed = Number(args.seed ?? 1);
const channel = args.browser === "chromium" ? undefined : "chrome";
const exportedPath = args.exported ? resolve(args.exported) : undefined;

/** Deterministic shuffle (mulberry32), so a failing order can be replayed with the same --seed. */
function shuffled(count, rng) {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
function mulberry32(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
/** Decode every frame of an exported MP4 with FFmpeg (rgb24 pipe) and return the barcode index of each frame. */
function decodeExported(path, width, height, points) {
  return new Promise((resolveDecode, reject) => {
    const proc = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", path, "-map", "0:v:0", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"],
      { stdio: ["ignore", "pipe", "inherit"] });
    const size = width * height * 3, indices = [];
    let pending = Buffer.alloc(0);
    proc.stdout.on("data", chunk => {
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= size) {
        const frame = pending.subarray(0, size);
        pending = pending.subarray(size);
        const luminance = points.map(([x, y]) => { const o = (y * width + x) * 3; return (frame[o] + frame[o + 1] + frame[o + 2]) / 3; });
        indices.push(decodeLuminance(luminance));
      }
    });
    proc.once("error", reject);
    proc.once("close", code => code === 0 ? resolveDecode(indices) : reject(new Error("ffmpeg decode exited with code " + code)));
  });
}
/** Bits from measured luminance at the barcode cell centres. Ambiguous cells make the frame unreadable (NaN). */
function decodeLuminance(luminance) {
  let index = 0;
  for (let bit = 0; bit < BARCODE_BITS; bit += 1) {
    const value = luminance[bit];
    if (value > 200) index |= 1 << bit;
    else if (value >= 55) return Number.NaN;
  }
  return index;
}

const available = (await readdir(fixtures)).filter(name => name.endsWith(".clip.json")).map(name => name.replace(/\.clip\.json$/, ""));
const clips = args.clips ? args.clips.split(",") : available;
const browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
const report = { browser: browser.version(), base, seed, fixtures: {} };
let failed = false;

try {
  for (const id of clips) {
    if (!available.includes(id)) {
      // Corrupt inputs: the metadata probe must refuse them before any frame is drawn.
      const path = join(fixtures, id + ".mp4");
      try {
        await probeClipSource(path, id);
        report.fixtures[id] = { refused: false, note: "probe accepted a file expected to be corrupt" };
        failed = true;
      } catch (cause) {
        report.fixtures[id] = { refused: true, message: cause.message.split("\n")[0] };
      }
      continue;
    }
    const clip = JSON.parse(await readFile(join(fixtures, id + ".clip.json"), "utf8"));
    const expected = await readFile(join(fixtures, id + ".expected.json"), "utf8").then(JSON.parse).catch(() => undefined);
    const page = await browser.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1 });
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    const result = { clip: { width: clip.width, height: clip.height, frameCount: clip.frameCount,
      mode: clip.timestamps ? "variable-frame-rate" : "constant-frame-rate", rotation: clip.probe?.rotation, codec: clip.probe?.codec }, frames: [] };
    try {
      await page.goto(`${base}/iframe.html?id=video-real-source-clip--default&viewMode=story&kmExport=1&km_clip=${encodeURIComponent(id)}`,
        { waitUntil: "domcontentloaded", timeout: 60000 });
      const ready = await page.waitForFunction(() => typeof window.__kmVideoExport?.seek === "function" || document.querySelector("[role=alert]"),
        null, { timeout: 60000 });
      await ready.dispose();
      const alert = await page.evaluate(() => document.querySelector("[role=alert]")?.textContent ?? null);
      if (alert) {
        result.loadError = alert;
      } else {
        const manifest = await page.evaluate(() => window.__kmVideoExport.manifest);
        result.manifest = { durationFrames: manifest.durationFrames, width: manifest.width, height: manifest.height };
        // Expected timeline is ground truth from the generator; the probed clip metadata is what is being tested.
        const times = expected?.timestamps ?? clip.timestamps ?? Array.from({ length: clip.frameCount }, (_, i) => i * clip.fps.den / clip.fps.num);
        const { cellW, x0, y0, bandH } = barcodeLayout(manifest.width, manifest.height);
        const points = Array.from({ length: BARCODE_BITS }, (_, bit) => [x0 + bit * cellW + Math.floor(cellW / 2), y0 + Math.floor(bandH / 2)]);
        const order = shuffled(manifest.durationFrames, mulberry32(seed + id.length));
        for (const frame of order) {
          const entry = { frame };
          try {
            await page.evaluate(f => window.__kmVideoExport.seek(f), frame);
          } catch (cause) {
            entry.seekError = cause.message.split("\n")[0];
          }
          const state = await page.evaluate(pts => {
            const el = document.querySelector("[data-km-frame-clip]");
            const canvas = el?.querySelector("canvas");
            const context = canvas?.getContext("2d");
            const luminance = context ? pts.map(([x, y]) => { const d = context.getImageData(x, y, 1, 1).data; return (d[0] + d[1] + d[2]) / 3; }) : [];
            return { status: el?.dataset.clipStatus, phase: el?.dataset.clipPhase, componentExpected: el?.dataset.expectedSourceFrame,
              componentDrawn: el?.dataset.sourceFrame, luminance };
          }, points);
          const expectedIndex = expected ? expected.sourceIndices[expectedSourceFrame(times, frame, OUT_FPS)] : undefined;
          const independentExpected = expectedSourceFrame(times, frame, OUT_FPS);
          Object.assign(entry, { status: state.status, phase: state.phase, componentExpected: state.componentExpected,
            componentDrawn: state.componentDrawn, independentSourceFrame: independentExpected,
            decoded: decodeLuminance(state.luminance), expectedIndex });
          result.frames.push(entry);
        }
        result.frames.sort((a, b) => a.frame - b.frame);
        const shown = result.frames.filter(f => f.status === "ready" || f.status === "inexact");
        const counts = {};
        for (const f of result.frames) counts[f.status ?? "none"] = (counts[f.status ?? "none"] ?? 0) + 1;
        const wrong = shown.filter(f => f.decoded !== f.expectedIndex);
        const unreadable = shown.filter(f => Number.isNaN(f.decoded));
        const mappingDisagreements = result.frames.filter(f => f.seekError === undefined && String(f.independentSourceFrame) !== f.componentExpected);
        result.summary = {
          frames: result.frames.length, statuses: counts,
          wrongFramesShownAsReadyOrInexact: wrong.length, unreadableFrames: unreadable.length,
          componentMappingDisagreements: mappingDisagreements.length, seekErrors: result.frames.filter(f => f.seekError).length,
          exact: counts.ready === result.frames.length && wrong.length === 0 && unreadable.length === 0 && mappingDisagreements.length === 0,
        };
        // Safety: no frame may be reported ready or inexact while showing the wrong source frame. A truncated or
        // stale clip is expected to be non-exact, but must not be shown as correct.
        // Truncated media is expected to be non-exact; it must never show a wrong frame.
        const expectExact = !id.startsWith("truncated");
        result.summary.safe = wrong.length === 0 && mappingDisagreements.length === 0 && unreadable.length === 0;
        result.summary.expectExact = expectExact;
        if (!result.summary.safe || (expectExact && !result.summary.exact)) failed = true;
        if (wrong.length) result.firstWrong = wrong.slice(0, 5);
        if (exportedPath && clips.length === 1) {
          const indices = await decodeExported(exportedPath, manifest.width, manifest.height, points);
          const outputs = Array.from({ length: manifest.durationFrames }, (_, k) => k);
          const exportWrong = outputs.filter(k => indices[k] !== expected.sourceIndices[expectedSourceFrame(times, k, OUT_FPS)]);
          result.exported = { file: exportedPath, decodedFrames: indices.length, expectedFrames: manifest.durationFrames,
            wrongOrUnreadable: exportWrong.length, firstWrong: exportWrong.slice(0, 5).map(k => ({ frame: k, decoded: indices[k] ?? null,
              expected: expected.sourceIndices[expectedSourceFrame(times, k, OUT_FPS)] })) };
          if (exportWrong.length || indices.length !== manifest.durationFrames) failed = true;
        }
      }
    } catch (cause) {
      result.harnessError = cause.message.split("\n")[0];
    } finally {
      if (pageErrors.length) result.pageErrors = pageErrors.slice(0, 5);
      report.fixtures[id] = result;
      await page.close();
    }
  }
} finally {
  await browser.close();
}
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
process.exitCode = failed ? 1 : 0;
