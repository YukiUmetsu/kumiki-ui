#!/usr/bin/env node
/**
 * Subject matte for a video file (VE1.5): the subject cut out of every frame, as a video with an alpha channel.
 *
 *   npm run video:matte -- <input> --out=<cutout.webm> [--mask=<mask.mp4>] [--model=isnet|u2netp] [--width=<px>]
 *     [--from=<s|Nf>] [--to=<s|Nf>] [--smoothing=0.5] [--edge=0.006] [--clean=0.12] [--threads=<n>] [--overwrite] [--log=info] [--format=json]
 *
 * FFmpeg decodes the input (scaled to --width, keeping its shape) to RGB frames at its own rate. A Python process runs a salient-object
 * segmentation model on each frame on the CPU (scripts/video-matte-model.py, onnxruntime): IS-Net by default, U^2-Net-p for speed. Both
 * are their authors' Apache-2.0 models; the file is fetched once into ~/.cache/kumiki/models (or $KUMIKI_MODELS) and checked against its
 * SHA-256 before use. Node refines each raw mask (`registry/video/subject-matte.ts`: clean levels, guided-filter edges, motion-gated
 * steadying), estimates the subject's own colour in its soft edges, and streams the cutout to a VP9 encoder with alpha (yuva420p).
 * `--mask` also writes the refined matte as a grey video. Errors carry a code: usage, file-missing, probe-failed, ffmpeg-missing,
 * python-missing, model-download, model-checksum, time-range, output-exists, decode-failed, model-failed, encode-failed.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { createLogger, decodeArgs, frameRange, parseProbe, PipelineError } from "./selective-color-core.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** The models, pinned by checksum. Sources: the rembg project's mirror of the authors' weights (rembg is MIT; the weights are Apache-2.0). */
export const MATTE_MODELS = {
  isnet: { file: "isnet-general-use.onnx", kind: "isnet", sha256: "60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a", megabytes: 179,
    url: "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx", licence: "Apache-2.0 (https://github.com/xuebinqin/DIS)" },
  u2netp: { file: "u2netp.onnx", kind: "u2net", sha256: "309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8", megabytes: 5,
    url: "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx", licence: "Apache-2.0 (https://github.com/xuebinqin/U-2-Net)" },
};
const FLAGS = ["out", "mask", "model", "width", "from", "to", "smoothing", "edge", "clean", "threads", "log", "format"];
const USAGE = "Usage: npm run video:matte -- <input> --out=<cutout.webm> [--mask=<mask.mp4>] [--model=isnet|u2netp] [--width=] [--from=] [--to=] [--smoothing=] [--edge=] [--threads=] [--overwrite] [--log=] [--format=json]";

export function parseArgs(argv) {
  const flags = {}, files = [];
  for (const arg of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!m) { files.push(arg); continue; }
    if (m[2] === undefined && m[1] === "overwrite") flags.overwrite = true;
    else if (FLAGS.includes(m[1]) && m[2] !== undefined) flags[m[1]] = m[2];
    else throw new PipelineError("usage", `Unknown option ${arg}.`, USAGE);
  }
  if (files.length !== 1 || !flags.out) throw new PipelineError("usage", "An input and --out are needed.", USAGE);
  if (!/\.webm$/i.test(flags.out)) throw new PipelineError("usage", "The cutout is a WebM: VP9 is the codec that browsers decode with an alpha channel.", "Name --out something.webm.");
  if (flags.model && !MATTE_MODELS[flags.model]) throw new PipelineError("usage", `"${flags.model}" is not a model.`, `Models: ${Object.keys(MATTE_MODELS).join(", ")}.`);
  const number = (name, lo, hi) => { if (flags[name] === undefined) return undefined; const v = Number(flags[name]); if (!(v >= lo && v <= hi)) throw new PipelineError("usage", `--${name} runs from ${lo} to ${hi}.`); return v; };
  return { input: resolve(files[0]), out: resolve(flags.out), mask: flags.mask && resolve(flags.mask), model: flags.model ?? "isnet", width: number("width", 64, 4096),
    from: flags.from, to: flags.to, smoothing: number("smoothing", 0, .9), edge: number("edge", 0, .05), clean: number("clean", 0, .44), threads: number("threads", 1, 64), overwrite: Boolean(flags.overwrite),
    log: flags.log ?? "info", format: flags.format };
}

/** The model file: from the cache if its checksum matches, else downloaded and checked. */
export async function ensureModel(name, log, dir = process.env.KUMIKI_MODELS ?? join(homedir(), ".cache/kumiki/models")) {
  const model = MATTE_MODELS[name], path = join(dir, model.file), sum = file => createHash("sha256").update(readFileSync(file)).digest("hex");
  if (existsSync(path) && sum(path) === model.sha256) return { ...model, path };
  mkdirSync(dir, { recursive: true });
  log.info(`Downloading ${model.file} (${model.megabytes} MB, ${model.licence}).`);
  const response = await fetch(model.url).catch(error => { throw new PipelineError("model-download", `Could not download ${model.url}: ${error.message}.`); });
  if (!response.ok || !response.body) throw new PipelineError("model-download", `Downloading ${model.url} failed: HTTP ${response.status}.`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(path + ".part"));
  if (sum(path + ".part") !== model.sha256) { rmSync(path + ".part", { force: true }); throw new PipelineError("model-checksum", `${model.file} does not match its pinned checksum.`, "The download was damaged or the file changed upstream; it was not used."); }
  renameSync(path + ".part", path);
  return { ...model, path };
}

/** The refine options the flags set; the rest keep their defaults. */
const refineOptions = args => ({ ...args.smoothing !== undefined ? { smoothing: args.smoothing } : {}, ...args.edge !== undefined ? { edgeRadius: args.edge } : {}, ...args.clean !== undefined ? { clean: args.clean } : {} });
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

async function main() {
  const args = parseArgs(process.argv.slice(2)), log = createLogger(args.log, undefined, "video-matte"), started = Date.now();
  if (!existsSync(args.input) || statSync(args.input).isDirectory()) throw new PipelineError("file-missing", `There is no video at ${args.input}.`);
  for (const out of [args.out, args.mask].filter(Boolean)) if (existsSync(out) && !args.overwrite) throw new PipelineError("output-exists", `${out} already exists.`, "Pass --overwrite to replace it.");
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", args.input], { encoding: "utf8", maxBuffer: 16 << 20 });
  if (probe.error) throw new PipelineError("ffmpeg-missing", "ffprobe could not run: " + probe.error.message, "Install FFmpeg.");
  if (probe.status !== 0) throw new PipelineError("probe-failed", `ffprobe could not read ${args.input}.`);
  const info = parseProbe(JSON.parse(probe.stdout), args.input), range = frameRange(info, args.from, args.to);
  for (const warning of range.warnings) log.warn(warning);
  // Even sizes, as the encoder's chroma needs; the shape of the source.
  const width = 2 * Math.round((args.width ?? info.width) / 2), height = 2 * Math.round(width * info.height / info.width / 2), size = { width, height };
  if (spawnSync("python3", ["-c", "import onnxruntime, numpy, PIL"]).status !== 0) throw new PipelineError("python-missing", "python3 with onnxruntime, numpy and Pillow is needed for the model.", "pip install onnxruntime numpy pillow");
  const weights = await ensureModel(args.model, log);
  const work = mkdtempSync(join(tmpdir(), "km-matte-")), bundle = join(work, "matte.mjs");
  try {
    await build({ entryPoints: [join(ROOT, "registry/video/subject-matte.ts")], bundle: true, format: "esm", platform: "node", outfile: bundle, logLevel: "silent" });
    const matte = await import(pathToFileURL(bundle).href), problems = matte.inspectMatteOptions(refineOptions(args));
    if (problems.length) throw new PipelineError("usage", problems.join(" "));
    log.info(`Matting ${range.count} frames at ${width}×${height} with ${args.model}.`);
    const fps = `${info.fps.num}/${info.fps.den}`;
    const decoder = spawn("ffmpeg", decodeArgs(info, range.start, range.count, size), { stdio: ["ignore", "pipe", "pipe"] });
    const net = spawn("python3", ["-I", join(ROOT, "scripts/video-matte-model.py"), `--model=${weights.path}`, `--kind=${MATTE_MODELS[args.model].kind}`, `--width=${width}`, `--height=${height}`, ...args.threads ? [`--threads=${args.threads}`] : []], { stdio: ["pipe", "pipe", "pipe"] });
    const encoder = spawn("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${width}x${height}`, "-r", fps, "-i", "pipe:0",
      "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", "-b:v", "0", "-crf", "24", "-row-mt", "1", args.out], { stdio: ["pipe", "ignore", "pipe"] });
    const maskEncoder = args.mask && spawn("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", `${width}x${height}`, "-r", fps, "-i", "pipe:0",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "12", args.mask], { stdio: ["pipe", "ignore", "pipe"] });
    const errors = { decoder: "", model: "", encoder: "", mask: "" };
    decoder.stderr.on("data", d => errors.decoder += d); net.stderr.on("data", d => errors.model += d); encoder.stderr.on("data", d => errors.encoder += d);
    if (maskEncoder) maskEncoder.stderr.on("data", d => errors.mask += d);
    // Each process's exit, watched from the start: the decoder closes long before the encoder.
    const exited = child => new Promise(ok => child.on("close", code => ok(code)));
    const exits = [exited(decoder), exited(net), exited(encoder), maskEncoder ? exited(maskEncoder) : Promise.resolve(0)];
    const pending = [], rgbBytes = width * height * 3;
    // Feed the model as frames decode; keep each frame until its mask comes back.
    const feeding = (async () => {
      for await (const rgba of frames(decoder.stdout, width * height * 4)) {
        const frame = new Uint8ClampedArray(rgba), rgb = Buffer.alloc(rgbBytes);
        for (let p = 0, q = 0; p < frame.length; p += 4, q += 3) { rgb[q] = frame[p]; rgb[q + 1] = frame[p + 1]; rgb[q + 2] = frame[p + 2]; }
        pending.push(frame);
        await write(net.stdin, rgb);
      }
      net.stdin.end();
    })();
    const state = {};
    let done = 0;
    for await (const raw of frames(net.stdout, width * height)) {
      const data = pending.shift(), mask = new Float32Array(raw.length);
      for (let k = 0; k < raw.length; k++) mask[k] = raw[k] / 255;
      const frame = { width, height, data }, alpha = matte.refineMatte(mask, frame, state, refineOptions(args));
      await write(encoder.stdin, Buffer.from(matte.cutout(frame, alpha).buffer));
      if (maskEncoder) { const grey = Buffer.alloc(alpha.length); for (let k = 0; k < alpha.length; k++) grey[k] = Math.round(alpha[k] * 255); await write(maskEncoder.stdin, grey); }
      if (++done % 30 === 0) log.info(`${done} / ${range.count} frames`);
    }
    await feeding;
    encoder.stdin.end();
    if (maskEncoder) maskEncoder.stdin.end();
    const [d, m, e, k] = await Promise.all(exits);
    if (d !== 0) throw new PipelineError("decode-failed", "FFmpeg could not decode the input: " + errors.decoder.trim().split("\n").pop());
    if (m !== 0) throw new PipelineError("model-failed", "The model failed: " + errors.model.trim().split("\n").pop());
    if (e !== 0 || k !== 0) throw new PipelineError("encode-failed", "FFmpeg could not encode: " + (errors.encoder || errors.mask).trim().split("\n").pop());
    if (done !== range.count) throw new PipelineError("model-failed", `The model returned ${done} masks for ${range.count} frames.`);
    const report = { input: args.input, out: args.out, mask: args.mask ?? null, model: args.model, width, height, fps: info.fpsValue, frames: done, startFrame: range.start, seconds: (Date.now() - started) / 1000 };
    if (args.format === "json") process.stdout.write(JSON.stringify(report) + "\n");
    else log.info(`Wrote ${args.out}: ${done} frames in ${report.seconds.toFixed(1)} s.`);
  } finally { rmSync(work, { recursive: true, force: true }); }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    const json = process.argv.includes("--format=json"), code = error instanceof PipelineError ? error.code : "internal";
    if (json) process.stdout.write(JSON.stringify({ error: { code, message: error.message, hint: error.hint } }) + "\n");
    else process.stderr.write(`[video-matte] error (${code}): ${error.message}${error.hint ? `\n  ${error.hint}` : ""}\n`);
    process.exit(1);
  });
}
