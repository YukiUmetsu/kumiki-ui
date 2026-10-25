#!/usr/bin/env node
/** Generate real-source footage fixtures for the K1 check. Every frame carries its own source index as a barcode,
 * so the Chrome verifier can read back which frame was drawn. Output is generated locally; nothing is committed.
 * npm run video:fixtures -- <output-dir>
 */
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import { FIXTURES, codedForPortrait, codedForPortraitCcw, keptIndices, paintIndex } from "./real-source-fixtures.mjs";
import { probeClipSource } from "./probe-clip-source.mjs";

const outDir = resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Usage: node scripts/generate-real-source-fixtures.mjs <output-dir>");

const runFfmpeg = args => new Promise((resolveRun, reject) => {
  const proc = spawn("ffmpeg", args, { stdio: "inherit" });
  proc.once("error", reject);
  proc.once("close", code => code === 0 ? resolveRun() : reject(new Error("ffmpeg exited with code " + code)));
});

/** Stream raw RGB24 frames into FFmpeg. `frames` is a list of frame indices to paint, in order. */
function encode({ out, width, height, fps, indices, codec, tag, drop, rotate, pix = "yuv420p", extra = [], sar }) {
  return new Promise((resolveEncode, reject) => {
    const args = ["-hide_banner", "-loglevel", "error", "-y",
      "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", width + "x" + height, "-r", String(fps), "-i", "pipe:0"];
    // Variable frame rate: the select filter removes frames and -fps_mode passthrough keeps the original timestamps.
    const filters = [];
    if (drop) filters.push("select='not(eq(mod(n\\,7)\\,3))'");
    if (sar) filters.push("setsar=" + sar.replace(":", "/"));
    if (filters.length) args.push("-vf", filters.join(","), "-fps_mode", "passthrough");
    // Codec defaults suit libx264/libx265; encoders with other options (AV1) pass their own through `extra`.
    const quality = extra.length ? extra : ["-crf", "18", "-preset", "medium"];
    args.push("-c:v", codec, ...quality, "-pix_fmt", pix, "-bf", "0");
    if (tag) args.push("-tag:v", tag);
    args.push("-movflags", "+faststart", out);
    const proc = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
    proc.once("error", reject);
    proc.once("close", code => code === 0 ? resolveEncode() : reject(new Error("ffmpeg exited with code " + code)));
    (async () => {
      for (const index of indices) {
        // A fresh buffer per frame: FFmpeg may still hold the previous one while the next is painted.
        const frame = rotate
          ? (rotate === 270 ? codedForPortraitCcw : codedForPortrait)(paintIndex(Buffer.alloc(height * width * 3), height, width, index), height, width).buffer
          : paintIndex(Buffer.alloc(width * height * 3), width, height, index);
        if (!proc.stdin.write(frame)) await new Promise(resolveDrain => proc.stdin.once("drain", resolveDrain));
      }
      proc.stdin.end();
    })().catch(reject);
  });
}

await mkdir(outDir, { recursive: true });
for (const fixture of FIXTURES) {
  const out = join(outDir, fixture.id + ".mp4");
  // Rotated fixtures paint the upright portrait frame; the coded frame is written landscape with rotation metadata.
  // Display size: the sample aspect ratio stretches the coded width; a quarter turn swaps the two sides.
  const [sarNum, sarDen] = (fixture.sar ?? "1:1").split(":").map(Number);
  const storedWidth = Math.round(fixture.width * sarNum / sarDen);
  const displayWidth = fixture.rotate ? fixture.height : storedWidth;
  const displayHeight = fixture.rotate ? storedWidth : fixture.height;
  const all = Array.from({ length: fixture.frames }, (_, n) => n);
  const kept = fixture.drop ? keptIndices(fixture.frames, fixture.drop) : all;
  // The coded frame size is the fixture's width × height; for rotated fixtures it is landscape, shown portrait.
  // Rotation is container metadata: encode the coded frames, then stream-copy them with -display_rotation on the input.
  const coded = fixture.rotate ? join(outDir, fixture.id + ".coded.mp4") : out;
  await encode({ out: coded, width: fixture.width, height: fixture.height, fps: fixture.fps, indices: all,
    codec: fixture.codec, tag: fixture.tag, drop: fixture.drop, rotate: fixture.rotate, pix: fixture.pix, extra: fixture.extra, sar: fixture.sar });
  if (fixture.rotate) {
    await runFfmpeg(["-hide_banner", "-loglevel", "error", "-y", "-display_rotation", String(fixture.rotate), "-i", coded, "-c", "copy", "-movflags", "+faststart", out]);
    await rm(coded, { force: true });
  }
  // Ground truth: each kept frame's source index and its ideal presentation time. Independent of the metadata
  // the verifier later probes, so a wrong clip description cannot make a wrong frame look correct.
  await writeFile(join(outDir, fixture.id + ".expected.json"), JSON.stringify({ id: fixture.id, sourceIndices: kept,
    timestamps: kept.map(n => n / fixture.fps), displayWidth, displayHeight, outputFps: { num: fixture.fps, den: 1 } }, null, 2) + "\n");
  await writeFile(join(outDir, fixture.id + ".clip.json"), JSON.stringify(await probeClipSource(out, fixture.id), null, 2) + "\n");
  process.stdout.write("Wrote " + out + " (" + kept.length + " kept frames)\n");
}

// Corrupt inputs: the verifier must refuse them with a stable error, never substitute a frame.
await writeFile(join(outDir, "garbage.mp4"), randomBytes(4096));
const good = await readFile(join(outDir, "cfr-h264.mp4"));
await writeFile(join(outDir, "truncated-h264.mp4"), good.subarray(0, Math.floor(good.length * 0.35)));
// A stale claim: the consumer still holds the metadata of the complete file. Decoding must fail, not substitute frames.
const staleClip = JSON.parse(await readFile(join(outDir, "cfr-h264.clip.json"), "utf8"));
await writeFile(join(outDir, "truncated-h264.clip.json"), JSON.stringify({ ...staleClip, id: "truncated-h264" }, null, 2) + "\n");
await writeFile(join(outDir, "truncated-h264.expected.json"), await readFile(join(outDir, "cfr-h264.expected.json")));
process.stdout.write("Wrote corrupt inputs garbage.mp4 and truncated-h264.mp4 (" + (await stat(join(outDir, "truncated-h264.mp4"))).size + " bytes)\n");
