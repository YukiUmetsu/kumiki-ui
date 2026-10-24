#!/usr/bin/env node
/** Describe a local video file as a Kumiki ClipSource (K1): displayed size after rotation, frame count and either
 * a constant rational fps or the presentation time of every frame. Uses ffprobe; decodes no pixels.
 * node scripts/probe-clip-source.mjs <file> [--id=<source-id>]
 */
import { spawn } from "node:child_process";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const run = (args) => new Promise((resolveRun, reject) => {
  const proc = spawn("ffprobe", ["-v", "error", ...args], { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  proc.stdout.on("data", chunk => { stdout += chunk; });
  proc.stderr.on("data", chunk => { stderr += chunk; });
  proc.once("error", reject);
  proc.once("close", code => code === 0 ? resolveRun(stdout) : reject(new Error("ffprobe failed (" + code + "): " + stderr.trim())));
});

/** Parse "30000/1001" or "30" into {num, den}. */
const rational = text => {
  const [num, den = "1"] = String(text).split("/").map(Number);
  if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den) || num < 1 || den < 1) return undefined;
  return { num, den };
};

export async function probeClipSource(path, id = basename(path).replace(/\.[^.]+$/, "")) {
  const file = resolve(path);
  const stream = JSON.parse(await run(["-select_streams", "v:0", "-show_entries",
    "stream=codec_name,width,height,r_frame_rate,avg_frame_rate:stream_side_data=rotation", "-of", "json", file])).streams?.[0];
  if (!stream) throw new Error(basename(file) + " has no video stream.");
  // The display matrix is side data carrying a "rotation" field (degrees, ffprobe convention).
  const displayMatrix = (stream.side_data_list ?? []).find(item => item.rotation !== undefined);
  const rotation = Number(displayMatrix?.rotation ?? 0);
  // A quarter turn swaps the displayed dimensions; the browser draws the displayed frame.
  const quarter = Math.abs(rotation) % 180 === 90;
  const width = quarter ? stream.height : stream.width, height = quarter ? stream.width : stream.height;
  const times = (await run(["-select_streams", "v:0", "-show_entries", "frame=best_effort_timestamp_time",
    "-of", "csv=p=0", file])).split("\n").filter(Boolean).map(line => Number(line.split(",")[0]));
  if (!times.length || times.some(t => !Number.isFinite(t)))
    throw new Error(basename(file) + " has frames without presentation times; refusing to guess a timeline.");
  for (let i = 1; i < times.length; i += 1)
    if (times[i] <= times[i - 1]) throw new Error(basename(file) + " presentation times are not strictly ascending at frame " + i + ".");
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  const median = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? 0;
  const constant = gaps.every(g => Math.abs(g - median) <= median * 1e-3 + 1e-9);
  const source = { id, width, height, frameCount: times.length };
  if (constant) {
    // Constant rate: prefer the stream's declared rate, checked against the measured spacing.
    const declared = rational(stream.avg_frame_rate) ?? rational(stream.r_frame_rate);
    source.fps = declared && Math.abs(declared.den / declared.num - median) <= median * 1e-3 + 1e-9
      ? declared : { num: Math.round(1 / median), den: 1 };
  } else {
    source.timestamps = times;
  }
  return { ...source, probe: { codec: stream.codec_name, coded: { width: stream.width, height: stream.height }, rotation,
    variableFrameRate: !constant } };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [file, ...flags] = process.argv.slice(2);
  const id = flags.find(flag => flag.startsWith("--id="))?.slice("--id=".length);
  if (!file) throw new Error("Usage: node scripts/probe-clip-source.mjs <file> [--id=<source-id>]");
  process.stdout.write(JSON.stringify(await probeClipSource(file, id), null, 2) + "\n");
}
