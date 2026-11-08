#!/usr/bin/env node
/** Compare two renders of the same film, frame by frame, against a declared tolerance.
 *   npm run film:compare -- <a.mp4> <b.mp4> [--min-psnr=45] [--format=json]
 * The same renderer on the same machine gives identical files. Across renderers (software WebGL against a GPU) and machines, pixels move
 * slightly at edges. Measured on 2026-11-08 on an M4: software against Metal GPU averaged 49.9 dB, worst frame 48.8 dB. The default
 * tolerance, 45 dB, is the declared bound for "the same picture"; below it, something changed that a person would see.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2), files = args.filter(arg => !arg.startsWith("--"));
const flag = name => args.find(arg => arg.startsWith(`--${name}=`))?.split("=")[1];
const minPsnr = Number(flag("min-psnr") ?? 45);
if (files.length !== 2 || !files.every(existsSync) || !(minPsnr > 0)) { console.error("Usage: npm run film:compare -- <a.mp4> <b.mp4> [--min-psnr=45] [--format=json]"); process.exit(1); }
const frames = file => Number(spawnSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", file], { encoding: "utf8" }).stdout.trim());
const [na, nb] = files.map(frames);
if (na !== nb) { console.error(`The renders have different lengths: ${na} and ${nb} frames.`); process.exit(1); }
const dir = mkdtempSync(join(tmpdir(), "km-compare-")), stats = join(dir, "psnr.txt");
const run = spawnSync("ffmpeg", ["-v", "error", "-i", files[0], "-i", files[1], "-lavfi", `psnr=stats_file=${stats}`, "-f", "null", "-"], { encoding: "utf8" });
if (run.status !== 0) { rmSync(dir, { recursive: true, force: true }); console.error("FFmpeg could not compare the files: " + run.stderr); process.exit(1); }
const values = readFileSync(stats, "utf8").trim().split("\n").map(line => { const v = /psnr_avg:(\S+)/.exec(line)?.[1]; return v === "inf" ? Infinity : Number(v); });
rmSync(dir, { recursive: true, force: true });
const finite = values.filter(Number.isFinite), identical = finite.length === 0;
const mean = identical ? Infinity : finite.reduce((a, b) => a + b, 0) / finite.length, worst = Math.min(...values), worstFrame = values.indexOf(worst);
const failing = values.map((v, frame) => ({ frame, psnr: v })).filter(item => item.psnr < minPsnr);
const result = { schemaVersion: 1, files, frames: na, identical, meanPsnr: mean, worstPsnr: worst, worstFrame, minPsnr, ok: failing.length === 0, failing: failing.slice(0, 20) };
const db = v => Number.isFinite(v) ? v.toFixed(1) + " dB" : "identical";
if (flag("format") === "json") console.log(JSON.stringify(result, (key, value) => value === Infinity ? "identical" : value, 2));
else {
  console.log(`${na} frames. Mean ${db(mean)}, worst ${db(worst)} at frame ${worstFrame}. Tolerance: ${minPsnr} dB.`);
  console.log(result.ok ? (identical ? "The renders are identical." : "Same picture within tolerance.") : `${failing.length} frame(s) below tolerance, first at frame ${failing[0].frame}.`);
}
process.exitCode = result.ok ? 0 : 1;
