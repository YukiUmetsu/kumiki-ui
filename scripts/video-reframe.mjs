#!/usr/bin/env node
/**
 * Subject reframe for a video file (VE1.12): a crop of another shape, such as a vertical 9:16 from a landscape clip, that follows the
 * subject.
 *
 *   npm run video:reframe -- <input> --cutout=<cutout.webm> --out=<vertical.mp4> [--aspect=9:16] [--mode=auto|stationary|panning|tracking]
 *     [--motion=slower|default|faster] [--padding=0.06] [--height=<px>] [--from=<s|Nf>] [--to=<s|Nf>] [--track=<track.json>]
 *     [--crf=18] [--overwrite] [--log=info] [--format=json]
 *
 * The subject's place in each frame comes from its cutout (`npm run video:matte`), whose first frame is the input's frame at --from: the
 * box around its alpha (`subjectBox`). The planner (`registry/video/subject-reframe.ts`) reads the whole range, then picks a stationary,
 * panning or tracking crop that keeps the subject in. Each frame is resampled from the crop's exact place, to a fraction of a pixel, with
 * a Catmull-Rom filter. The output has the crop's shape, at --height (default the source's own height), with the input's audio.
 * --track writes the subject's track for a film's footage scene (`reframe.track`).
 *
 * Errors carry a code: usage, file-missing, probe-failed, ffmpeg-missing, time-range, output-exists, cutout-mismatch, decode-failed,
 * no-subject, encode-failed.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { createLogger, decodeArgs, frameRange, outputCodec, parseProbe, PipelineError } from "./selective-color-core.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FLAGS = ["out", "cutout", "aspect", "mode", "motion", "padding", "height", "from", "to", "track", "crf", "log", "format"];
const USAGE = "Usage: npm run video:reframe -- <input> --cutout=<cutout.webm> --out=<out.mp4> [--aspect=9:16] [--mode=] [--motion=] [--padding=] [--height=] [--from=] [--to=] [--track=] [--crf=] [--overwrite] [--log=] [--format=json]";
const REFRAME_MODES = ["auto", "stationary", "panning", "tracking"], REFRAME_MOTIONS = ["slower", "default", "faster"];

/** A shape as width ÷ height, from "9:16" or a number. */
export function parseAspect(text) {
  const m = /^(\d+(?:\.\d+)?)(?::(\d+(?:\.\d+)?))?$/.exec(String(text).trim()), value = m ? Number(m[1]) / (m[2] ? Number(m[2]) : 1) : NaN;
  if (!(value >= .2 && value <= 5)) throw new PipelineError("usage", `"${text}" is not a shape.`, "Give width:height (9:16, 4:5, 1:1) or a ratio from 0.2 to 5.");
  return value;
}
export function parseArgs(argv) {
  const flags = {}, files = [];
  for (const arg of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!m) { files.push(arg); continue; }
    if (m[2] === undefined && m[1] === "overwrite") flags.overwrite = true;
    else if (FLAGS.includes(m[1]) && m[2] !== undefined) flags[m[1]] = m[2];
    else throw new PipelineError("usage", `Unknown option ${arg}.`, USAGE);
  }
  if (files.length !== 1 || !flags.out || !flags.cutout) throw new PipelineError("usage", "An input, --cutout and --out are needed.", USAGE);
  const mode = flags.mode ?? "auto", motion = flags.motion ?? "default";
  if (!REFRAME_MODES.includes(mode)) throw new PipelineError("usage", `"${mode}" is not a mode.`, `Modes: ${REFRAME_MODES.join(", ")}.`);
  if (!REFRAME_MOTIONS.includes(motion)) throw new PipelineError("usage", `"${motion}" is not a motion setting.`, `Settings: ${REFRAME_MOTIONS.join(", ")}.`);
  const number = (name, lo, hi, fallback) => { if (flags[name] === undefined) return fallback; const v = Number(flags[name]); if (!(v >= lo && v <= hi)) throw new PipelineError("usage", `--${name} runs from ${lo} to ${hi}.`); return v; };
  const height = number("height", 64, 4320, undefined);
  if (height !== undefined && !Number.isInteger(height)) throw new PipelineError("usage", "--height is a whole number of pixels.");
  return { input: resolve(files[0]), cutout: resolve(flags.cutout), out: resolve(flags.out), aspect: parseAspect(flags.aspect ?? "9:16"), mode, motion,
    padding: number("padding", 0, .3, .06), height, from: flags.from, to: flags.to, track: flags.track && resolve(flags.track), crf: number("crf", 0, 51, 18),
    overwrite: Boolean(flags.overwrite), log: flags.log ?? "info", format: flags.format };
}
/** The output's size: the crop's shape at `height` (default the crop's own height), both even, as the encoder's chroma needs. */
export function outputSize(crop, height) {
  const h = 2 * Math.round((height ?? crop.height) / 2);
  return { width: Math.max(2, 2 * Math.round(h * crop.width / crop.height / 2)), height: h };
}

/** Frames from a child's stdout, each `bytes` long, in order. */
async function* frames(stream, bytes) {
  let pending = Buffer.alloc(0);
  for await (const chunk of stream) {
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    while (pending.length >= bytes) { yield pending.subarray(0, bytes); pending = pending.subarray(bytes); }
  }
}
/** Write to a child's stdin, waiting when it is full. */
const write = (stream, data) => new Promise((ok, fail) => {
  if (stream.write(data)) { ok(); return; }
  const drained = () => { stream.off("error", failed); ok(); }, failed = error => { stream.off("drain", drained); fail(error); };
  stream.once("drain", drained); stream.once("error", failed);
});
const probe = file => {
  const result = spawnSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8", maxBuffer: 16 << 20 });
  if (result.error) throw new PipelineError("ffmpeg-missing", "ffprobe could not run: " + result.error.message, "Install FFmpeg.");
  if (result.status !== 0) throw new PipelineError("probe-failed", `ffprobe could not read ${file}.`);
  return parseProbe(JSON.parse(result.stdout), file);
};

async function main() {
  const args = parseArgs(process.argv.slice(2)), log = createLogger(args.log, undefined, "video-reframe"), started = Date.now();
  for (const file of [args.input, args.cutout]) if (!existsSync(file) || statSync(file).isDirectory()) throw new PipelineError("file-missing", `There is no video at ${file}.`);
  for (const out of [args.out, args.track].filter(Boolean)) if (existsSync(out) && !args.overwrite) throw new PipelineError("output-exists", `${out} already exists.`, "Pass --overwrite to replace it.");
  const info = probe(args.input), cut = probe(args.cutout), range = frameRange(info, args.from, args.to), codec = outputCodec(args.out);
  for (const warning of range.warnings) log.warn(warning);
  if (Math.abs(cut.fpsValue - info.fpsValue) > .01) throw new PipelineError("cutout-mismatch", `The cutout runs at ${cut.fpsValue} fps and the input at ${info.fpsValue}.`, "Make the cutout from this input.");
  if (Math.abs(cut.width / cut.height - info.width / info.height) > .01) throw new PipelineError("cutout-mismatch", `The cutout is ${cut.width}×${cut.height} and the input ${info.width}×${info.height}: not the same shape.`);
  const work = mkdtempSync(join(tmpdir(), "km-reframe-")), bundle = join(work, "reframe.mjs");
  try {
    await build({ entryPoints: [join(ROOT, "registry/video/subject-reframe.ts")], bundle: true, format: "esm", platform: "node", outfile: bundle, logLevel: "silent" });
    const reframe = await import(pathToFileURL(bundle).href);
    // The subject's box in each frame, from the cutout's alpha (libvpx decodes VP9's alpha; FFmpeg's own decoder drops it).
    const alphaArgs = ["-v", "error", "-nostdin", "-c:v", "libvpx-vp9", "-i", args.cutout, "-map", "0:v:0", "-frames:v", String(range.count), "-vf", "alphaextract", "-f", "rawvideo", "-pix_fmt", "gray", "pipe:1"];
    const alphaDecoder = spawn("ffmpeg", alphaArgs, { stdio: ["ignore", "pipe", "pipe"] });
    let alphaErrors = "";
    alphaDecoder.stderr.on("data", d => alphaErrors += d);
    const alphaExit = new Promise(ok => alphaDecoder.on("close", code => ok(code)));
    const scale = info.width / cut.width, boxes = [];
    for await (const alpha of frames(alphaDecoder.stdout, cut.width * cut.height)) {
      const box = reframe.subjectBox(alpha, cut.width, cut.height);
      boxes.push(box && { x: box.x * scale, y: box.y * scale, width: box.width * scale, height: box.height * scale, cx: box.cx * scale, cy: box.cy * scale, area: box.area });
    }
    if (await alphaExit !== 0) throw new PipelineError("decode-failed", "FFmpeg could not read the cutout's alpha: " + alphaErrors.trim().split("\n").pop(), "A cutout is a VP9 WebM with alpha, from npm run video:matte.");
    if (boxes.length < range.count) throw new PipelineError("cutout-mismatch", `The cutout has ${boxes.length} frames and the range ${range.count}.`, "Make the cutout over the same range, or pass --to.");
    const track = { width: info.width, height: info.height, fps: info.fpsValue, frames: boxes }, plan = reframe.planReframe(track, { aspect: args.aspect, mode: args.mode, motion: args.motion, padding: args.padding });
    for (const problem of plan.problems) if (problem.severity === "error") throw new PipelineError("no-subject", problem.message); else log.warn(problem.message);
    const size = outputSize(plan, args.height), enlarged = size.height / plan.height;
    if (enlarged > 1.5) log.warn(`The crop is enlarged ${enlarged.toFixed(2)} times; it will look soft. Use a larger source or a smaller --height.`);
    log.info(`${plan.mode} crop, ${Math.round(plan.width)}×${Math.round(plan.height)} of ${info.width}×${info.height}, to ${size.width}×${size.height}; fastest move ${plan.speed.toFixed(2)} crop widths a second.`);
    if (args.track) writeFileSync(args.track, JSON.stringify({ width: info.width, height: info.height, fps: info.fpsValue, offset: range.start, rows: reframe.trackRows(track) }) + "\n");

    const toSeconds = count => (count * info.fps.den / info.fps.num).toFixed(6), rate = `${info.fps.num}/${info.fps.den}`;
    const decoder = spawn("ffmpeg", decodeArgs(info, range.start, range.count), { stdio: ["ignore", "pipe", "pipe"] });
    const encoder = spawn("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${size.width}x${size.height}`, "-r", rate, "-i", "pipe:0",
      "-ss", toSeconds(range.start), "-t", toSeconds(range.count), "-i", args.input, "-map", "0:v", "-map", "1:a?",
      "-c:v", codec.encoder, "-pix_fmt", codec.pixelFormat, ...codec.quality(args.crf), "-c:a", "aac", "-b:a", "160k", "-shortest",
      ...codec.container === "mp4" ? ["-movflags", "+faststart"] : [], args.out], { stdio: ["pipe", "ignore", "pipe"] });
    const errors = { decoder: "", encoder: "" };
    decoder.stderr.on("data", d => errors.decoder += d); encoder.stderr.on("data", d => errors.encoder += d);
    // Each process's exit, watched from the start: the decoder closes long before the encoder.
    const exits = [decoder, encoder].map(child => new Promise(ok => child.on("close", code => ok(code))));
    let done = 0;
    for await (const rgba of frames(decoder.stdout, info.width * info.height * 4)) {
      await write(encoder.stdin, Buffer.from(reframe.resampleCrop(rgba, info.width, info.height, reframe.reframeCrop(plan, done), size.width, size.height).buffer));
      if (++done % 60 === 0) log.info(`${done} / ${range.count} frames`);
    }
    encoder.stdin.end();
    const [d, e] = await Promise.all(exits);
    if (d !== 0) throw new PipelineError("decode-failed", "FFmpeg could not decode the input: " + errors.decoder.trim().split("\n").pop());
    if (e !== 0) throw new PipelineError("encode-failed", "FFmpeg could not encode: " + errors.encoder.trim().split("\n").pop());
    const report = { input: args.input, cutout: args.cutout, out: args.out, track: args.track ?? null, mode: plan.mode, crop: { width: plan.width, height: plan.height },
      output: size, speed: Number(plan.speed.toFixed(3)), frames: done, startFrame: range.start, problems: plan.problems, seconds: (Date.now() - started) / 1000 };
    if (args.format === "json") process.stdout.write(JSON.stringify(report) + "\n");
    else log.info(`Wrote ${args.out}: ${done} frames in ${report.seconds.toFixed(1)} s.`);
  } finally { rmSync(work, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    const json = process.argv.includes("--format=json"), code = error instanceof PipelineError ? error.code : "internal";
    if (json) process.stdout.write(JSON.stringify({ error: { code, message: error.message, hint: error.hint } }) + "\n");
    else process.stderr.write(`[video-reframe] error (${code}): ${error.message}${error.hint ? `\n  ${error.hint}` : ""}\n`);
    process.exit(1);
  });
}
