#!/usr/bin/env node
/**
 * Smooth slow motion for a video file (VE1.7): new in-between frames, so footage slowed 2 to 8 times plays smoothly instead of
 * repeating each frame.
 *
 *   npm run video:slowmo -- <input> --out=<output.mp4> [--factor=4] [--method=mci|blend] [--from=<s|Nf>] [--to=<s|Nf>]
 *     [--check] [--crf=18] [--overwrite] [--log=info] [--format=json]
 *
 * FFmpeg makes the frames. `mci` (default) is motion-compensated interpolation (`minterpolate`: bidirectional motion estimation,
 * overlapped-block compensation, variable-size blocks): moving things travel between frames. `blend` cross-fades neighbouring frames:
 * no warping, but moving edges double. The output runs at the source's rate, `factor` times longer; the audio is left out.
 *
 * `--check` measures how well the method rebuilds real frames on this clip before you trust it: every other frame of the range is
 * dropped, rebuilt by the method and by plain repeating, and each is compared with the real frame it replaces (SSIM). A method that
 * barely beats repeating frames, or scores under 0.85, will show its seams; slow less, or pick footage with slower motion.
 *
 * Errors carry a code: usage, file-missing, probe-failed, ffmpeg-missing, time-range, output-exists, encode-failed, check-failed.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createLogger, frameRange, outputCodec, parseProbe, PipelineError } from "./selective-color-core.mjs";

const FLAGS = ["out", "factor", "method", "from", "to", "crf", "log", "format"];
const USAGE = "Usage: npm run video:slowmo -- <input> --out=<output.mp4> [--factor=4] [--method=mci|blend] [--from=] [--to=] [--check] [--crf=] [--overwrite] [--log=] [--format=json]";
export const SLOWMO_METHODS = ["mci", "blend"];

export function parseArgs(argv) {
  const flags = {}, files = [];
  for (const arg of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!m) { files.push(arg); continue; }
    if (m[2] === undefined && (m[1] === "overwrite" || m[1] === "check")) flags[m[1]] = true;
    else if (FLAGS.includes(m[1]) && m[2] !== undefined) flags[m[1]] = m[2];
    else throw new PipelineError("usage", `Unknown option ${arg}.`, USAGE);
  }
  if (files.length !== 1 || !flags.out) throw new PipelineError("usage", "An input and --out are needed.", USAGE);
  const factor = Number(flags.factor ?? 4), method = flags.method ?? "mci", crf = Number(flags.crf ?? 18);
  if (!(Number.isInteger(factor) && factor >= 2 && factor <= 8)) throw new PipelineError("usage", "--factor is a whole number from 2 to 8.", "Past about 8 times, made-up frames outnumber real ones nine to one.");
  if (!SLOWMO_METHODS.includes(method)) throw new PipelineError("usage", `"${method}" is not a method.`, `Methods: ${SLOWMO_METHODS.join(", ")}.`);
  if (!(Number.isFinite(crf) && crf >= 0 && crf <= 51)) throw new PipelineError("usage", "--crf runs from 0 to 51.");
  return { input: resolve(files[0]), out: resolve(flags.out), factor, method, from: flags.from, to: flags.to, check: Boolean(flags.check), crf, overwrite: Boolean(flags.overwrite), log: flags.log ?? "info", format: flags.format };
}

/** The filter that makes `fps × factor` frames a second from a `fps` source, by `method`. */
export function interpolateFilter(method, fps, factor) {
  const rate = `${fps.num * factor}/${fps.den}`;
  return method === "mci" ? `minterpolate=fps=${rate}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1` : `framerate=fps=${rate}`;
}
/** FFmpeg arguments that write the slowed clip: the range interpolated, then stretched `factor` times, at the source's rate. */
export function slowmoArgs(info, range, args, codec) {
  const seconds = frames => (frames * info.fps.den / info.fps.num).toFixed(6), rate = `${info.fps.num}/${info.fps.den}`;
  return ["-v", "error", "-y", "-ss", seconds(range.start), "-t", seconds(range.count), "-i", info.file, "-map", "0:v:0", "-an",
    "-vf", `fps=${rate},${interpolateFilter(args.method, info.fps, args.factor)},setpts=${args.factor}*PTS`, "-r", rate,
    "-c:v", codec.encoder, "-pix_fmt", codec.pixelFormat, ...codec.quality(args.crf), ...codec.container === "mp4" ? ["-movflags", "+faststart"] : [], args.out];
}
/** The mean SSIM between two clips' frames, from FFmpeg's ssim filter output. */
export function parseSsim(stderr) {
  const m = /All:([0-9.]+)/.exec(stderr);
  if (!m) throw new PipelineError("check-failed", "FFmpeg reported no SSIM.");
  return Number(m[1]);
}

/** Drop every other frame of the range, rebuild them by `method` and by repeating, and score each against the real frames it replaces. */
function check(info, range, method, log) {
  const work = mkdtempSync(join(tmpdir(), "km-slowmo-check-")), seconds = frames => (frames * info.fps.den / info.fps.num).toFixed(6), rate = `${info.fps.num}/${info.fps.den}`;
  const run = (args) => { const r = spawnSync("ffmpeg", args, { encoding: "utf8", maxBuffer: 64 << 20 }); if (r.status !== 0) throw new PipelineError("check-failed", "FFmpeg failed in the check: " + r.stderr.trim().split("\n").pop()); return r.stderr; };
  try {
    const source = join(work, "source.mkv"), half = join(work, "half.mkv"), half_rate = `${info.fps.num}/${info.fps.den * 2}`;
    run(["-v", "error", "-y", "-ss", seconds(range.start), "-t", seconds(range.count), "-i", info.file, "-map", "0:v:0", "-an", "-vf", `fps=${rate}`, "-c:v", "ffv1", source]);
    run(["-v", "error", "-y", "-i", source, "-vf", `select=not(mod(n\\,2)),setpts=N/(${half_rate})/TB`, "-r", half_rate, "-c:v", "ffv1", half]);
    const score = filter => {
      const rebuilt = join(work, "rebuilt.mkv");
      run(["-v", "error", "-y", "-i", half, "-vf", filter, "-c:v", "ffv1", rebuilt]);
      // Only the rebuilt frames (the odd ones) are compared: the kept frames would score 1.
      return parseSsim(run(["-i", rebuilt, "-i", source, "-lavfi", "[0:v]select=mod(n\\,2)[a];[1:v]select=mod(n\\,2)[b];[a][b]ssim", "-f", "null", "-"]));
    };
    const method_ = score(interpolateFilter(method, { num: info.fps.num, den: info.fps.den * 2 }, 2)), repeat = score(`fps=${rate}`);
    const result = { method, ssim: Number(method_.toFixed(4)), repeat: Number(repeat.toFixed(4)), gain: Number((method_ - repeat).toFixed(4)), warnings: [] };
    if (result.ssim < .85) result.warnings.push(`Rebuilt frames score ${result.ssim} SSIM against the real ones: expect visible warping. Slow less, or use footage with slower motion.`);
    if (result.gain < .005) result.warnings.push(`${method} barely beats repeating frames (${result.gain} SSIM): the motion is too fast or too complex to follow.`);
    for (const warning of result.warnings) log.warn(warning);
    return result;
  } finally { rmSync(work, { recursive: true, force: true }); }
}

async function main() {
  const args = parseArgs(process.argv.slice(2)), log = createLogger(args.log, undefined, "video-slowmo"), started = Date.now();
  if (!existsSync(args.input) || statSync(args.input).isDirectory()) throw new PipelineError("file-missing", `There is no video at ${args.input}.`);
  if (existsSync(args.out) && !args.overwrite) throw new PipelineError("output-exists", `${args.out} already exists.`, "Pass --overwrite to replace it.");
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", args.input], { encoding: "utf8", maxBuffer: 16 << 20 });
  if (probe.error) throw new PipelineError("ffmpeg-missing", "ffprobe could not run: " + probe.error.message, "Install FFmpeg.");
  if (probe.status !== 0) throw new PipelineError("probe-failed", `ffprobe could not read ${args.input}.`);
  const info = parseProbe(JSON.parse(probe.stdout), args.input), range = frameRange(info, args.from, args.to), codec = outputCodec(args.out);
  for (const warning of range.warnings) log.warn(warning);
  const checked = args.check ? check(info, range, args.method, log) : undefined;
  if (checked) log.info(`Check: ${args.method} rebuilds frames at ${checked.ssim} SSIM; repeating them scores ${checked.repeat}.`);
  log.info(`Slowing ${range.count} frames ${args.factor} times with ${args.method}.`);
  const encode = spawnSync("ffmpeg", slowmoArgs(info, range, args, codec), { encoding: "utf8", maxBuffer: 64 << 20 });
  if (encode.status !== 0) throw new PipelineError("encode-failed", "FFmpeg could not write the slow motion: " + (encode.stderr ?? "").trim().split("\n").pop());
  // Counted, not assumed: interpolation cannot reach past the last source frame, so a clip comes out a few frames short of count × factor.
  const counted = spawnSync("ffprobe", ["-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", args.out], { encoding: "utf8" });
  const report = { input: args.input, out: args.out, method: args.method, factor: args.factor, sourceFrames: range.count, frames: Number(counted.stdout.trim()), fps: info.fpsValue,
    ...checked ? { check: checked } : {}, seconds: (Date.now() - started) / 1000 };
  if (args.format === "json") process.stdout.write(JSON.stringify(report) + "\n");
  else log.info(`Wrote ${args.out}: ${report.frames} frames in ${report.seconds.toFixed(1)} s.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    const json = process.argv.includes("--format=json"), code = error instanceof PipelineError ? error.code : "internal";
    if (json) process.stdout.write(JSON.stringify({ error: { code, message: error.message, hint: error.hint } }) + "\n");
    else process.stderr.write(`[video-slowmo] error (${code}): ${error.message}${error.hint ? `\n  ${error.hint}` : ""}\n`);
    process.exit(1);
  });
}
