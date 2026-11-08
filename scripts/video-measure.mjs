#!/usr/bin/env node
/** Bounded, model-free review of the visual pacing in a film or reference video. */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { analyzeVideoFrames, parseVideoMetadata } from "./video-measure-core.mjs";

const args = process.argv.slice(2);
const file = args.find(arg => !arg.startsWith("--"));
const usage = "Usage: npm run video:measure -- <file> [--format=json] [--max-seconds=600]";
if (!file || args.filter(arg => !arg.startsWith("--")).length !== 1 ||
    args.some(arg => arg.startsWith("--") && arg !== "--format=json" && !arg.startsWith("--max-seconds=")))
  throw Error(usage);
const json = args.includes("--format=json");
const maxArg = args.find(arg => arg.startsWith("--max-seconds="));
const maxSeconds = maxArg ? Number(maxArg.split("=")[1]) : 600;
if (!Number.isInteger(maxSeconds) || maxSeconds < 1 || maxSeconds > 3600) throw Error("--max-seconds must be an integer from 1 to 3600");
const input = resolve(file);
const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries",
  "stream=width,height,avg_frame_rate,r_frame_rate:format=duration", "-of", "json", input],
{ encoding: "utf8", timeout: 15000, maxBuffer: 1 << 20 });
if (probe.status !== 0) throw Error("ffprobe could not read " + file + ": " + (probe.error?.message ?? probe.stderr));
const info = JSON.parse(probe.stdout);
const stream = info.streams?.[0];
const rate = value => { const [num, den] = (value ?? "0/0").split("/").map(Number); return den > 0 ? num / den : 0; };
const fps = rate(stream?.avg_frame_rate) || rate(stream?.r_frame_rate);
if (!Number.isFinite(fps) || fps <= 0 || stream?.width <= 0 || stream?.height <= 0)
  throw Error("ffprobe returned an invalid video frame rate or size");
const sourceSeconds = Number(info.format?.duration);
const truncated = Number.isFinite(sourceSeconds) ? sourceSeconds > maxSeconds + 1 / fps : null;
const run = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", input, "-t", String(maxSeconds), "-an",
  "-vf", `trim=duration=${maxSeconds},scale=320:-2,scdet=threshold=12,signalstats,metadata=mode=print:file=-`, "-f", "null", "-"],
{ encoding: "utf8", timeout: 600000, maxBuffer: 128 << 20 });
if (run.status !== 0) throw Error("ffmpeg could not measure " + file + ": " + (run.error?.message ?? run.stderr.slice(-600)));
const report = analyzeVideoFrames(parseVideoMetadata(run.stdout),
  { file, width: stream.width, height: stream.height, fps, truncated });
if (json) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`${file}: ${report.width}×${report.height}, ${report.seconds} s scanned at ${report.fps} fps` + (truncated ? " (partial scan)" : ""));
  console.log(`Cuts: ${report.cuts.count} (${report.cuts.perMinute} a minute). Shots: median ${report.shots.medianSeconds} s, ${report.shots.shortestSeconds} to ${report.shots.longestSeconds} s.`);
  console.log(`Visual events: ${report.events.perTenSeconds} per 10 s. Longest gap: ${report.events.longestGapSeconds} s.`);
  console.log(`First substantial change: ${report.firstChangeSeconds ?? "none"} s (heuristic).`);
  console.log(`Still: ${Math.round(report.still.share * 100)}% of the scan. Longest still stretch: ${report.still.longestSeconds} s.`);
  console.log(`Whole-frame flash candidates: ${report.flashes.count}; peak ${report.flashes.mostInOneSecond} per second${report.flashes.reviewRequired ? " (REVIEW REQUIRED)" : ""}.`);
  console.log(`Isolated near-blank frame candidates: ${report.dropoutCandidates.length}${report.dropoutCandidates.length ? ` at ${report.dropoutCandidates.slice(0, 8).map(item => item.seconds + " s").join(", ")}` : ""}.`);
  console.log("Advisory only: local/red flashes and WCAG conformance are not assessed. Review source frames.");
}
// A screen finding is actionable, but a zero exit status is never proof of accessibility conformance.
process.exitCode = report.flashes.reviewRequired ? 1 : 0;
