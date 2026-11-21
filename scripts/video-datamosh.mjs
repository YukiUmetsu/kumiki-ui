#!/usr/bin/env node
/**
 * A real datamosh between two clips (VE1.9): the second clip's motion moves the first clip's last picture, until a keyframe brings the
 * second clip back clean.
 *
 *   npm run video:datamosh -- <a> <b> --out=<mosh.mp4> [--a-from=] [--a-to=] [--b-from=] [--b-to=] [--mosh=24] [--bloom=0]
 *     [--width=960] [--quality=3] [--crf=18] [--overwrite] [--log=info] [--format=json]
 *
 * How it works, as video artists do it by hand: both clips are re-encoded as MPEG-4 Part 2 at one size and rate, with no B-frames and a
 * single keyframe each (the second clip gets a second keyframe `--mosh` frames in). Their raw streams are split at the VOP start codes
 * (00 00 01 B6), and the second clip's first VOP, its keyframe, is left out. The decoder then applies the second clip's motion vectors and
 * residuals to the first clip's last picture: its colours smear along the new motion, and the new picture's edges paint over them, until
 * the next keyframe. `--bloom` repeats the second clip's first motion that many times first, so the pixels keep flowing ("bloom").
 * The result is decoded by FFmpeg and encoded as H.264; frame for frame the same every run. The audio is left out.
 *
 * Errors carry a code: usage, file-missing, probe-failed, ffmpeg-missing, time-range, output-exists, encode-failed, stream-failed.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createLogger, frameRange, parseProbe, PipelineError } from "./selective-color-core.mjs";

const FLAGS = ["out", "a-from", "a-to", "b-from", "b-to", "mosh", "bloom", "width", "quality", "crf", "log", "format"];
const USAGE = "Usage: npm run video:datamosh -- <a> <b> --out=<mosh.mp4> [--a-from=] [--a-to=] [--b-from=] [--b-to=] [--mosh=24] [--bloom=0] [--width=960] [--quality=3] [--crf=18] [--overwrite] [--log=] [--format=json]";

export function parseArgs(argv) {
  const flags = {}, files = [];
  for (const arg of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!m) { files.push(arg); continue; }
    if (m[2] === undefined && m[1] === "overwrite") flags.overwrite = true;
    else if (FLAGS.includes(m[1]) && m[2] !== undefined) flags[m[1]] = m[2];
    else throw new PipelineError("usage", `Unknown option ${arg}.`, USAGE);
  }
  if (files.length !== 2 || !flags.out) throw new PipelineError("usage", "Two clips and --out are needed.", USAGE);
  const whole = (name, fallback, lo, hi) => { const v = flags[name] === undefined ? fallback : Number(flags[name]); if (!(Number.isInteger(v) && v >= lo && v <= hi)) throw new PipelineError("usage", `--${name} is a whole number from ${lo} to ${hi}.`); return v; };
  return { a: resolve(files[0]), b: resolve(files[1]), out: resolve(flags.out), aFrom: flags["a-from"], aTo: flags["a-to"], bFrom: flags["b-from"], bTo: flags["b-to"],
    mosh: whole("mosh", 24, 2, 600), bloom: whole("bloom", 0, 0, 60), width: whole("width", 960, 64, 3840), quality: whole("quality", 3, 1, 31), crf: whole("crf", 18, 0, 51),
    overwrite: Boolean(flags.overwrite), log: flags.log ?? "info", format: flags.format };
}

/** The VOPs (coded pictures) of a raw MPEG-4 Part 2 stream, as [start, end) byte ranges, and the header before the first one. */
export function splitVops(stream) {
  const starts = [];
  for (let i = 0; i + 3 < stream.length; i++) if (stream[i] === 0 && stream[i + 1] === 0 && stream[i + 2] === 1 && stream[i + 3] === 0xB6) starts.push(i);
  if (!starts.length) throw new PipelineError("stream-failed", "The MPEG-4 stream has no pictures.");
  return { header: stream.subarray(0, starts[0]), vops: starts.map((start, k) => stream.subarray(start, starts[k + 1] ?? stream.length)) };
}
/** A VOP's coding type, from the two bits after its start code: "I", "P", "B" or "S". */
export const vopType = vop => "IPBS"[vop[4] >> 6];

/** The moshed stream: the first clip whole, then the second without its first keyframe, its first motion repeated `bloom` times. */
export function assembleMosh(a, b, bloom = 0) {
  const first = splitVops(a), second = splitVops(b);
  if (vopType(second.vops[0]) !== "I") throw new PipelineError("stream-failed", "The second clip does not start on a keyframe.");
  if (second.vops.length < 2 || vopType(second.vops[1]) !== "P") throw new PipelineError("stream-failed", "The second clip has no motion after its keyframe.");
  if (second.vops.slice(1).some(vop => vopType(vop) === "B")) throw new PipelineError("stream-failed", "The second clip has B-frames; it must be encoded without them.");
  return { stream: Buffer.concat([first.header, ...first.vops, ...Array(bloom).fill(second.vops[1]), ...second.vops.slice(1)]), frames: first.vops.length + bloom + second.vops.length - 1,
    moshAt: first.vops.length, recoverAt: (() => { const k = second.vops.findIndex((vop, i) => i > 0 && vopType(vop) === "I"); return k > 0 ? first.vops.length + bloom + k - 1 : undefined; })() };
}

function run(args, code, what) {
  const r = spawnSync("ffmpeg", args, { encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.error) throw new PipelineError("ffmpeg-missing", "FFmpeg could not run: " + r.error.message, "Install FFmpeg.");
  if (r.status !== 0) throw new PipelineError(code, `FFmpeg could not ${what}: ` + (r.stderr ?? "").trim().split("\n").pop());
}
function probe(file) {
  if (!existsSync(file) || statSync(file).isDirectory()) throw new PipelineError("file-missing", `There is no video at ${file}.`);
  const r = spawnSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8", maxBuffer: 16 << 20 });
  if (r.error) throw new PipelineError("ffmpeg-missing", "ffprobe could not run: " + r.error.message, "Install FFmpeg.");
  if (r.status !== 0) throw new PipelineError("probe-failed", `ffprobe could not read ${file}.`);
  return parseProbe(JSON.parse(r.stdout), file);
}

async function main() {
  const args = parseArgs(process.argv.slice(2)), log = createLogger(args.log, undefined, "video-datamosh"), started = Date.now();
  if (existsSync(args.out) && !args.overwrite) throw new PipelineError("output-exists", `${args.out} already exists.`, "Pass --overwrite to replace it.");
  const a = probe(args.a), b = probe(args.b), aRange = frameRange(a, args.aFrom, args.aTo), bRange = frameRange(b, args.bFrom, args.bTo);
  for (const warning of [...aRange.warnings, ...bRange.warnings]) log.warn(warning);
  if (args.mosh >= bRange.count) log.warn(`--mosh (${args.mosh}) is past the second clip's ${bRange.count} frames: it never recovers.`);
  // One size (the first clip's shape at --width) and one rate (the first clip's) for both, as the decoder needs.
  const width = 2 * Math.round(args.width / 2), height = 2 * Math.round(width * a.height / a.width / 2), rate = `${a.fps.num}/${a.fps.den}`;
  const work = mkdtempSync(join(tmpdir(), "km-datamosh-"));
  try {
    const encode = (info, range, file, keyAt) => {
      const seconds = frames => (frames * info.fps.den / info.fps.num).toFixed(6);
      run(["-v", "error", "-y", "-ss", seconds(range.start), "-t", seconds(range.count), "-i", info.file, "-map", "0:v:0", "-an",
        "-vf", `fps=${rate},scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width}:${height},setsar=1`,
        "-c:v", "mpeg4", "-q:v", String(args.quality), "-bf", "0", "-g", "100000", "-sc_threshold", "1000000000",
        ...keyAt !== undefined ? ["-force_key_frames", `expr:eq(n,${keyAt})`] : [], "-f", "m4v", file], "encode-failed", "re-encode a clip as MPEG-4");
    };
    encode(a, aRange, join(work, "a.m4v"));
    encode(b, bRange, join(work, "b.m4v"), args.mosh);
    const mosh = assembleMosh(readFileSync(join(work, "a.m4v")), readFileSync(join(work, "b.m4v")), args.bloom);
    writeFileSync(join(work, "mosh.m4v"), mosh.stream);
    log.info(`Moshing at frame ${mosh.moshAt}${mosh.recoverAt !== undefined ? `, clean again at ${mosh.recoverAt}` : ""}, ${mosh.frames} frames.`);
    run(["-v", "error", "-y", "-f", "m4v", "-r", rate, "-i", join(work, "mosh.m4v"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", String(args.crf), "-r", rate, "-movflags", "+faststart", args.out], "encode-failed", "write the result");
    const report = { a: args.a, b: args.b, out: args.out, width, height, fps: a.fpsValue, frames: mosh.frames, moshAt: mosh.moshAt, recoverAt: mosh.recoverAt ?? null, bloom: args.bloom, seconds: (Date.now() - started) / 1000 };
    if (args.format === "json") process.stdout.write(JSON.stringify(report) + "\n");
    else log.info(`Wrote ${args.out}.`);
  } finally { rmSync(work, { recursive: true, force: true }); }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    const json = process.argv.includes("--format=json"), code = error instanceof PipelineError ? error.code : "internal";
    if (json) process.stdout.write(JSON.stringify({ error: { code, message: error.message, hint: error.hint } }) + "\n");
    else process.stderr.write(`[video-datamosh] error (${code}): ${error.message}${error.hint ? `\n  ${error.hint}` : ""}\n`);
    process.exit(1);
  });
}
