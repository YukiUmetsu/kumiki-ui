#!/usr/bin/env node
/**
 * Selective colour on a video file (VP1.3): decode, process, encode.
 *
 *   npm run video:selective-color -- <input> --config=<config.json> --out=<output.mp4>
 *     [--from=<s|Nf>] [--to=<s|Nf>] [--workers=<n>] [--codec=h264|hevc|prores|vp9] [--crf=<n>]
 *     [--no-audio] [--overwrite] [--log=debug|info|warn|error] [--format=json]
 *
 * FFmpeg decodes the input to RGBA frames at its own rate. A pool of worker threads makes each frame's mask (colour
 * match, matte clean-up, feathering), which needs no state. The main thread smooths the masks in frame order and
 * composites them, so the result is the same with any number of workers, then streams frames to an FFmpeg encoder,
 * carrying the source's audio over the same span. The config is a `SelectiveColorInput` (see
 * docs/component-specs/selective-color.md); its windows are in the source's time.
 *
 * Errors carry a code: file-missing, probe-failed, no-video-stream, codec-unsupported, encoder-unsupported,
 * config-missing, config-invalid, time-range, output-exists, decode-failed, encode-failed.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import { build } from "esbuild";
import { createLogger, decodeArgs, encodeArgs, frameRange, outputCodec, parseCodecList, parseProbe, PipelineError } from "./selective-color-core.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FLAGS = ["config", "out", "from", "to", "workers", "codec", "crf", "log", "format"];
const USAGE = "Usage: npm run video:selective-color -- <input> --config=<config.json> --out=<output.mp4> [--from=] [--to=] [--workers=] [--codec=] [--crf=] [--no-audio] [--overwrite] [--log=] [--format=json]";

function parseArgs(argv) {
  const flags = {}, files = [];
  for (const arg of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!m) { files.push(arg); continue; }
    if (m[2] === undefined && (m[1] === "no-audio" || m[1] === "overwrite")) flags[m[1]] = true;
    else if (FLAGS.includes(m[1]) && m[2] !== undefined) flags[m[1]] = m[2];
    else throw new PipelineError("usage", `Unknown option ${arg}.`, USAGE);
  }
  if (files.length !== 1 || !flags.config || !flags.out) throw new PipelineError("usage", "An input, --config and --out are needed.", USAGE);
  return { input: resolve(files[0]), ...flags };
}

const run = (bin, args) => spawnSync(bin, args, { encoding: "utf8", maxBuffer: 16 << 20, timeout: 60000 });

/** Check the input, the codecs and the config, and work out what to process. */
async function prepare(args, log) {
  if (!existsSync(args.input)) throw new PipelineError("file-missing", `There is no file at ${args.input}.`);
  if (statSync(args.input).isDirectory()) throw new PipelineError("file-missing", `${args.input} is a folder, not a video.`);
  const probe = run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", args.input]);
  if (probe.error) throw new PipelineError("ffmpeg-missing", "ffprobe could not run: " + probe.error.message, "Install FFmpeg (ffmpeg and ffprobe on the PATH).");
  if (probe.status !== 0) throw new PipelineError("probe-failed", `ffprobe could not read ${args.input}: ${probe.stderr.trim().split("\n").pop()}`, "Is it a video file, and not damaged?");
  const info = parseProbe(JSON.parse(probe.stdout), args.input);
  if (!parseCodecList(run("ffmpeg", ["-hide_banner", "-decoders"]).stdout).has(info.codec))
    throw new PipelineError("codec-unsupported", `This FFmpeg has no decoder for ${info.codec}.`, "Convert the input first, or use an FFmpeg built with that decoder.");
  const codec = outputCodec(args.out, args.codec);
  if (!parseCodecList(run("ffmpeg", ["-hide_banner", "-encoders"]).stdout).has(codec.encoder))
    throw new PipelineError("encoder-unsupported", `This FFmpeg has no ${codec.encoder} encoder for ${codec.codec}.`, "Pick another --codec.");
  if (info.variableFrameRate) log.warn(`${args.input} has a variable frame rate; it is held to ${info.fpsValue.toFixed(3)} fps.`);
  const configFile = resolve(args.config);
  if (!existsSync(configFile)) throw new PipelineError("config-missing", `There is no config at ${configFile}.`);
  let config;
  try { config = JSON.parse(readFileSync(configFile, "utf8")); }
  catch (error) { throw new PipelineError("config-invalid", `${configFile} is not JSON: ${error.message}`); }
  // The engine is TypeScript: bundle it once for this run, for the main thread and every worker.
  const work = mkdtempSync(join(tmpdir(), "km-selective-color-")), bundle = join(work, "engine.mjs");
  await build({ entryPoints: [join(ROOT, "registry/video/selective-color.ts")], bundle: true, format: "esm", platform: "node", outfile: bundle, logLevel: "silent" });
  const engine = await import(pathToFileURL(bundle).href);
  const { config: resolved, problems } = engine.resolveSelectiveColorConfig(config);
  const errors = problems.filter((p) => p.severity === "error");
  if (errors.length) throw new PipelineError("config-invalid", errors.map((p) => `${p.path}: ${p.message}`).join(" "), errors[0].hint);
  for (const p of problems) log.warn(`${p.path}: ${p.message}`, p.hint ? { hint: p.hint } : undefined);
  const range = frameRange(info, args.from, args.to, resolved.outOfRange);
  for (const w of range.warnings) log.warn(w);
  if (existsSync(resolve(args.out)) && !args.overwrite) throw new PipelineError("output-exists", `${args.out} exists.`, "Pass --overwrite to replace it.");
  const workers = args.workers !== undefined ? Number(args.workers) : Math.max(1, Math.min(8, availableParallelism() - 1));
  if (!Number.isInteger(workers) || workers < 1 || workers > 64) throw new PipelineError("usage", "--workers must be a whole number from 1 to 64.");
  const crf = args.crf !== undefined ? Number(args.crf) : undefined;
  if (crf !== undefined && !(Number.isInteger(crf) && crf >= 0 && crf <= 63)) throw new PipelineError("usage", "--crf must be a whole number from 0 to 63.");
  return { info, codec, config, resolved, engine, range, workers, crf, work, bundle };
}

/** Decode, process on the worker pool, and encode, keeping frame order. */
async function process_(args, prep, log) {
  const { info, codec, config, resolved, engine, range, work, bundle, crf } = prep, { width, height } = info, bytes = width * height * 4;
  const pool = await Promise.all(Array.from({ length: prep.workers }, () => new Promise((ok, fail) => {
    const worker = new Worker(join(ROOT, "scripts/selective-color-worker.mjs"), { workerData: { engine: pathToFileURL(bundle).href, config } });
    worker.once("message", (m) => (m.ready ? ok(worker) : fail(new Error("worker did not start"))));
    worker.once("error", fail);
  })));
  const decoder = spawn("ffmpeg", decodeArgs(info, range.start, range.count), { stdio: ["ignore", "pipe", "pipe"] });
  const encoder = spawn("ffmpeg", encodeArgs(info, resolve(args.out), codec, range, { audio: !args["no-audio"], crf }), { stdio: ["pipe", "ignore", "pipe"] });
  let decodeError = "", encodeError = "";
  decoder.stderr.on("data", (d) => { decodeError += d; });
  encoder.stderr.on("data", (d) => { encodeError += d; });
  const state = {}, done = new Map(), started = performance.now(), keptAll = [];
  let next = 0, sent = 0, pending = Buffer.alloc(0), lastLog = started, failure;
  // Frames decoded and not yet written: the decoder waits while there are enough, so memory stays bounded.
  const waiting = () => sent - next, enough = prep.workers * 3;
  const idle = [...pool];
  const write = (data) => new Promise((ok) => (encoder.stdin.write(Buffer.from(data.buffer, data.byteOffset, data.byteLength)) ? ok() : encoder.stdin.once("drain", ok)));
  let flushing = Promise.resolve();
  const flush = () => {
    flushing = flushing.then(async () => {
      while (done.has(next)) {
        const { buffer, mask } = done.get(next); done.delete(next);
        const frame = { width, height, data: new Uint8ClampedArray(buffer) }, t = (range.start + next) * info.fps.den / info.fps.num;
        const smoothed = engine.smoothMask(new Float32Array(mask), resolved, state);
        engine.composite(frame, smoothed, engine.strengthAt(resolved.windows, t, info.fpsValue), resolved, frame.data);
        let kept = 0;
        for (const v of smoothed) if (v >= 0.5) kept++;
        keptAll.push(kept / smoothed.length);
        await write(frame.data);
        next++;
        const now = performance.now();
        if (now - lastLog > 2000) { log.info(`frame ${next} of ${range.count}`, { fps: Number((next / ((now - started) / 1000)).toFixed(1)) }); lastLog = now; }
      }
      if (waiting() < enough) decoder.stdout.resume();
    });
  };
  const result = new Promise((ok, fail) => {
    for (const worker of pool) worker.on("message", (m) => {
      if (m.error) { failure = new PipelineError("process-failed", `A worker failed on frame ${m.id}: ${m.error}`); fail(failure); return; }
      done.set(m.id, m);
      idle.push(worker);
      dispatch();
      flush();
    });
    const queue = [];
    const dispatch = () => { while (idle.length && queue.length) { const job = queue.shift(); idle.shift().postMessage(job, [job.buffer]); } };
    decoder.stdout.on("data", (chunk) => {
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= bytes) {
        const frame = new Uint8ClampedArray(bytes);
        frame.set(pending.subarray(0, bytes));
        pending = pending.subarray(bytes);
        queue.push({ id: sent++, width, height, buffer: frame.buffer });
      }
      dispatch();
      if (waiting() >= enough) decoder.stdout.pause();
    });
    decoder.on("close", async (code) => {
      if (code !== 0) { fail(new PipelineError("decode-failed", `FFmpeg could not decode ${args.input}: ${decodeError.trim().split("\n").slice(-2).join(" ")}`)); return; }
      const wait = () => new Promise((r) => setTimeout(r, 20));
      while (next < sent && !failure) { await wait(); await flushing; }
      if (failure) return;
      if (sent < range.count) log.warn(`The video ended after ${sent} of ${range.count} frames.`);
      encoder.stdin.end();
      ok();
    });
  });
  const encoded = new Promise((ok, fail) => encoder.on("close", (code) => (code === 0 ? ok() : fail(new PipelineError("encode-failed", `FFmpeg could not encode ${args.out}: ${encodeError.trim().split("\n").slice(-2).join(" ")}`)))));
  try {
    await result;
    await encoded;
  } finally {
    for (const worker of pool) await worker.terminate();
    if (decoder.exitCode === null) decoder.kill();
    if (encoder.exitCode === null) encoder.kill();
    rmSync(work, { recursive: true, force: true });
  }
  const seconds = (performance.now() - started) / 1000;
  return { input: args.input, output: resolve(args.out), frames: next, width, height, fps: info.fpsValue, codec: codec.codec, audio: info.audio && !args["no-audio"],
    workers: prep.workers, seconds: Number(seconds.toFixed(2)), framesPerSecond: Number((next / seconds).toFixed(2)),
    kept: { mean: Number((keptAll.reduce((a, b) => a + b, 0) / Math.max(1, keptAll.length)).toFixed(4)), max: Number(Math.max(0, ...keptAll).toFixed(4)) } };
}

const argv = process.argv.slice(2), json = argv.includes("--format=json");
let log = createLogger("info");
try {
  const args = parseArgs(argv);
  log = createLogger(args.log ?? "info");
  const prep = await prepare(args, log);
  log.info(`${prep.info.width}×${prep.info.height} at ${prep.info.fpsValue.toFixed(3)} fps (${prep.info.codec}); frames ${prep.range.start} to ${prep.range.end}; ${prep.workers} workers`);
  const report = await process_(args, prep, log);
  if (json) console.log(JSON.stringify(report, null, 2));
  else console.log(`Wrote ${report.output}: ${report.frames} frames in ${report.seconds} s (${report.framesPerSecond} fps, ${report.workers} workers); colour kept in ${(report.kept.mean * 100).toFixed(1)}% of the picture on average.`);
} catch (error) {
  const code = error instanceof PipelineError ? error.code : "unexpected";
  log.error(error.message, { code, ...(error.hint ? { hint: error.hint } : {}) });
  if (json) console.log(JSON.stringify({ error: { code, message: error.message, hint: error.hint } }, null, 2));
  process.exitCode = 1;
}
