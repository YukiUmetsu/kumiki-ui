#!/usr/bin/env node
/** Measure the edit of any video file: cuts and shot lengths, still stretches, when the first change happens, and
 * flashes. It reads luminance statistics from FFmpeg, so it needs no model and works on a rendered film or on a
 * reference video for a teardown.
 * npm run video:measure -- <file> [--format=json]
 * A visual event is a peak of change between frames, so it counts a pop or a transition as well as a cut.
 * Limits: it sees the whole-frame mean, so a small local flash can pass. It cannot read text or tell a cut from a
 * very fast move.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const args = process.argv.slice(2), file = args.find(arg => !arg.startsWith("--")), json = args.includes("--format=json");
if (!file) throw Error("Usage: npm run video:measure -- <file> [--format=json]");
/** A frame differs from the frame before it by less than this mean luma step (of 255): nothing visible moved. */
const STILL = .12;
/** Stretches shorter than this are not reported as still. */
const STILL_SECONDS = 1;
/** WCAG 2.3.1: a flash is a pair of opposing luminance changes of 10% or more. More than three in one second fails. */
const FLASH_STEP = .1, FLASH_LIMIT = 3;

const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "csv=p=0", resolve(file)], { encoding: "utf8" });
if (probe.status !== 0) throw Error("ffprobe could not read " + file + ": " + (probe.error?.message ?? probe.stderr));
const [width, height, rate] = probe.stdout.trim().split(","), [num, den] = rate.split("/").map(Number), fps = num / (den || 1);
const run = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", resolve(file), "-an", "-vf", "scale=320:-2,scdet=threshold=12,signalstats,metadata=mode=print:file=-", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 30 });
if (run.status !== 0) throw Error("ffmpeg could not measure " + file + ": " + (run.error?.message ?? run.stderr.slice(-600)));

const frames = [];
for (const line of run.stdout.split("\n")) {
  const head = /^frame:(\d+)\s+pts:\S+\s+pts_time:(\S+)/.exec(line);
  if (head) { frames.push({ time: Number(head[2]), luma: 0, change: 0, cut: false }); continue; }
  const value = /^lavfi\.(signalstats\.YAVG|signalstats\.YDIF|scd\.time)=(\S+)/.exec(line), frame = frames[frames.length - 1];
  if (!value || !frame) continue;
  if (value[1] === "signalstats.YAVG") frame.luma = Number(value[2]) / 255;
  else if (value[1] === "signalstats.YDIF") frame.change = Number(value[2]);
  else frame.cut = true;
}
if (!frames.length) throw Error("FFmpeg returned no frame statistics for " + file);
const duration = frames[frames.length - 1].time + 1 / fps, round = (value, digits = 2) => Number(value.toFixed(digits));

const cuts = frames.filter(frame => frame.cut).map(frame => frame.time);
const edges = [0, ...cuts, duration], shots = edges.slice(1).map((end, index) => end - edges[index]).sort((a, b) => a - b);
const stills = [];
let start;
frames.forEach((frame, index) => {
  const still = index > 0 && frame.change < STILL;
  if (still && start === undefined) start = frames[index - 1].time;
  if ((!still || index === frames.length - 1) && start !== undefined) {
    if (frame.time - start >= STILL_SECONDS) stills.push({ start: round(start), seconds: round(frame.time - start) });
    start = undefined;
  }
});
// Opposing luminance steps. Each pair is one flash. Count them in every one-second window.
const swings = [];
let direction = 0, anchor = frames[0].luma;
for (const frame of frames) {
  const step = frame.luma - anchor;
  if (Math.abs(step) >= FLASH_STEP && Math.min(frame.luma, anchor) < .8) {
    if (direction && Math.sign(step) !== direction) swings.push(frame.time);
    direction = Math.sign(step); anchor = frame.luma;
  } else if (direction && Math.sign(step) === direction) anchor = frame.luma;
}
let worst = 0, worstAt = 0;
swings.forEach((time, index) => {
  const count = swings.filter((other, at) => at >= index && other - time < 1).length;
  if (count > worst) { worst = count; worstAt = time; }
});
// A visual event is a peak of change: a cut, a pop, a fast move or a transition. It counts changes that are not cuts.
const sorted = frames.map(frame => frame.change).sort((a, b) => a - b), typical = sorted[Math.floor(sorted.length / 2)];
const reach = Math.max(1, Math.round(fps / 4)), level = Math.max(1.5, typical * 3);
const events = frames.filter((frame, index) => frame.change >= level && frames.slice(Math.max(0, index - reach), index + reach + 1).every(other => other.change <= frame.change));
const firstChange = frames.find((frame, index) => index > 0 && (frame.cut || frame.change >= 1.5));
const stillSeconds = stills.reduce((total, item) => total + item.seconds, 0);
const report = {
  schemaVersion: 1, file, width: Number(width), height: Number(height), fps: round(fps, 3), seconds: round(duration),
  cuts: { count: cuts.length, perMinute: round(cuts.length / duration * 60, 1), times: cuts.map(time => round(time)) },
  shots: { medianSeconds: round(shots[Math.floor(shots.length / 2)]), shortestSeconds: round(shots[0]), longestSeconds: round(shots[shots.length - 1]) },
  events: { count: events.length, perTenSeconds: round(events.length / duration * 10, 1), longestGapSeconds: round(Math.max(...[0, ...events.map(frame => frame.time), duration].map((time, index, all) => index ? time - all[index - 1] : 0))) },
  firstChangeSeconds: firstChange ? round(firstChange.time) : null,
  still: { share: round(stillSeconds / duration), longestSeconds: stills.length ? Math.max(...stills.map(item => item.seconds)) : 0, stretches: stills },
  flashes: { mostInOneSecond: Math.floor(worst / 2), atSeconds: round(worstAt), passes: Math.floor(worst / 2) <= FLASH_LIMIT },
};
if (json) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`${file}: ${report.width}×${report.height}, ${report.seconds} s at ${report.fps} fps`);
  console.log(`Cuts: ${report.cuts.count} (${report.cuts.perMinute} a minute). Shots: median ${report.shots.medianSeconds} s, ${report.shots.shortestSeconds} to ${report.shots.longestSeconds} s.`);
  console.log(`Visual events: ${report.events.perTenSeconds} in each 10 s. Longest wait between two: ${report.events.longestGapSeconds} s.`);
  console.log(`First visible change: ${report.firstChangeSeconds ?? "none"} s.`);
  console.log(`Still: ${Math.round(report.still.share * 100)}% of the time. Longest still stretch: ${report.still.longestSeconds} s` + (stills.length ? ` (${stills.slice(0, 6).map(item => `${item.start} s for ${item.seconds} s`).join(", ")}).` : "."));
  console.log(`Flashes: at most ${report.flashes.mostInOneSecond} in one second. ${report.flashes.passes ? "Within" : "OVER"} the limit of ${FLASH_LIMIT}.`);
}
process.exitCode = report.flashes.passes ? 0 : 1;
