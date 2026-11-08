import assert from "node:assert/strict";
import test from "node:test";
import { analyzeVideoFrames, parseVideoMetadata } from "../scripts/video-measure-core.mjs";

const options = { file: "synthetic.mp4", width: 1920, height: 1080, fps: 10 };
const makeFrames = (values, changes = [], cuts = []) => values.map((luma, index) => ({
  time: index / 10, luma, change: changes[index] ?? 0, low: luma - 0.01, high: luma + 0.01,
  cut: cuts.includes(index),
}));

test("parses time, scene cuts, and all needed luma percentiles", () => {
  const parsed = parseVideoMetadata([
    "frame:0    pts:0       pts_time:0",
    "lavfi.signalstats.YAVG=102",
    "lavfi.signalstats.YDIF=0.5",
    "lavfi.signalstats.YLOW=90",
    "lavfi.signalstats.YHIGH=120",
    "frame:1    pts:1       pts_time:0.1",
    "lavfi.signalstats.YAVG=220",
    "lavfi.signalstats.YDIF=20",
    "lavfi.signalstats.YLOW=210",
    "lavfi.signalstats.YHIGH=240",
    "lavfi.scd.time=0.1",
  ].join("\n"));
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].luma, 102 / 255);
  assert.equal(parsed[0].low, 90 / 255);
  assert.equal(parsed[0].high, 120 / 255);
  assert.equal(parsed[1].change, 20);
  assert.equal(parsed[1].cut, true);
});

test("stillness includes final frame duration and does not count initial frame alone", () => {
  const report = analyzeVideoFrames(makeFrames(Array(30).fill(0.4)), options);
  assert.equal(report.seconds, 3);
  assert.equal(report.still.share, 1);
  assert.equal(report.still.longestSeconds, 3);
  assert.deepEqual(report.still.stretches, [{ start: 0, seconds: 3 }]);
  assert.equal(report.firstChangeSeconds, null);
});

test("brief still gaps are omitted and a change ends the long stretch", () => {
  const changes = Array(30).fill(0);
  changes[18] = 5;
  const report = analyzeVideoFrames(makeFrames(Array(30).fill(0.4), changes), options);
  assert.deepEqual(report.still.stretches, [{ start: 0, seconds: 1.8 }, { start: 1.8, seconds: 1.2 }]);
  assert.equal(report.firstChangeSeconds, 1.8);
});

test("opposing changes are paired once and high-rate whole-frame flashes request review", () => {
  const values = Array.from({ length: 20 }, (_, index) => index < 10 && index % 2 ? 0.8 : 0.1);
  const report = analyzeVideoFrames(makeFrames(values), options);
  assert.equal(report.flashes.count, 5);
  assert.equal(report.flashes.mostInOneSecond, 5);
  assert.equal(report.flashes.reviewRequired, true);
  assert.equal(report.flashes.wcagConformance, "not-assessed");
  assert.equal(report.scope.accessibility, "not-certified");
});

test("a low-risk screen never asserts WCAG compliance", () => {
  const report = analyzeVideoFrames(makeFrames(Array(20).fill(0.5)), options);
  assert.equal(report.flashes.reviewRequired, false);
  assert.equal(report.flashes.wcagConformance, "not-assessed");
  assert.equal("passes" in report.flashes, false);
});

test("changes several seconds apart are not counted as a rapid opposing flash pair", () => {
  const frames = makeFrames(Array.from({ length: 40 }, (_, index) => index < 15 ? 0.2 : index < 31 ? 0.8 : 0.2));
  assert.equal(analyzeVideoFrames(frames, options).flashes.count, 0);
});

test("isolated near-black frame with matching neighbors is a dropout candidate", () => {
  const frames = makeFrames(Array(20).fill(0.6));
  frames[5] = { ...frames[5], luma: 0.06, low: 0.05, high: 0.07, change: 130 };
  const report = analyzeVideoFrames(frames, options);
  assert.deepEqual(report.dropoutCandidates, [{ seconds: 0.5, kind: "near-black" }]);
});

test("isolated near-white frame with matching neighbors is a dropout candidate", () => {
  const frames = makeFrames(Array(20).fill(0.3));
  frames[8] = { ...frames[8], luma: 0.95, low: 0.94, high: 0.96, change: 140 };
  assert.deepEqual(analyzeVideoFrames(frames, options).dropoutCandidates, [{ seconds: 0.8, kind: "near-white" }]);
});

test("intentional dark holds and hard cuts are not misclassified as isolated dropouts", () => {
  const frames = makeFrames(Array.from({ length: 20 }, (_, i) => i >= 5 && i <= 8 ? 0.06 : 0.6));
  for (let i = 5; i <= 8; i++) frames[i] = { ...frames[i], low: 0.05, high: 0.07 };
  assert.equal(analyzeVideoFrames(frames, options).dropoutCandidates.length, 0);
});

test("cut timings and partial scan scope are preserved", () => {
  const report = analyzeVideoFrames(makeFrames(Array(20).fill(0.4), [], [10]), { ...options, truncated: true });
  assert.deepEqual(report.cuts.times, [1]);
  assert.equal(report.cuts.count, 1);
  assert.equal(report.shots.medianSeconds, 1);
  assert.equal(report.scope.truncated, true);
});

test("missing or corrupt FFmpeg metadata fails closed instead of reporting a pass", () => {
  const frames = parseVideoMetadata("frame:0 pts:0 pts_time:0\nlavfi.signalstats.YAVG=50");
  assert.throws(() => analyzeVideoFrames(frames, options), /Incomplete/);
  assert.throws(() => analyzeVideoFrames(makeFrames([0.5]), { ...options, fps: 0 }), /frame rate/);
  assert.throws(() => analyzeVideoFrames(makeFrames([0.5, 0.6]).reverse(), options), /unordered/);
});
