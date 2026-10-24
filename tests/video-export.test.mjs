import assert from "node:assert/strict";
import { test } from "node:test";
import { concatListText, ffmpegConcatArgs, ffmpegEncodeArgs, frameRateArg, partialPathFor, segmentFileName, segmentPlan, verifyExportProbe } from "../scripts/video-export-core.mjs";

const fps = { num: 30, den: 1 };
const expected = { width: 1080, height: 1920, fps, frames: 390, audio: false };
const videoStream = (overrides = {}) => ({
  codec_type: "video", codec_name: "h264", width: 1080, height: 1920, r_frame_rate: "30/1",
  nb_read_frames: "390", duration: "13.000000", ...overrides,
});
const probeOf = (streams, format = {}) => ({ streams, format: { duration: "13.000000", ...format } });

test("encode arguments stream PNG frames on stdin and never reference a frame directory", () => {
  const args = ffmpegEncodeArgs({ fps, outputPath: "out.partial.mp4", frames: 390 });
  assert.deepEqual(args.slice(args.indexOf("-f"), args.indexOf("-f") + 2), ["-f", "image2pipe"]);
  assert.ok(args.includes("pipe:0"));
  assert.ok(!args.some(arg => arg.includes("%07d")));
  assert.equal(args[args.indexOf("-t") + 1], "13");
  assert.ok(args.includes("-an"));
  assert.equal(args.at(-1), "out.partial.mp4");
});

test("encode arguments map supplied audio with a start offset and AAC", () => {
  const args = ffmpegEncodeArgs({ fps: { num: 30000, den: 1001 }, outputPath: "o.partial.mp4", audioPath: "mix.wav", startSeconds: 1.5, frames: 60 });
  assert.deepEqual(args.slice(args.indexOf("-ss"), args.indexOf("-ss") + 4), ["-ss", "1.5", "-i", "mix.wav"]);
  assert.deepEqual(args.slice(args.indexOf("-map"), args.indexOf("-map") + 4), ["-map", "0:v:0", "-map", "1:a:0"]);
  assert.equal(args[args.indexOf("-r") + 1], "30000/1001");
  assert.ok(args.includes("aac"));
  assert.equal(args[args.indexOf("-c:a") + 1], "aac");
});

test("rational frame rates keep their exact fraction", () => {
  assert.equal(frameRateArg({ num: 24000, den: 1001 }), "24000/1001");
});

test("a matching probe verifies with no problems", () => {
  assert.deepEqual(verifyExportProbe(probeOf([videoStream()]), expected), []);
});

test("wrong dimensions, codec, frame count and duration are each reported", () => {
  const problems = verifyExportProbe(probeOf([videoStream({ width: 324, height: 576, codec_name: "vp9", nb_read_frames: "389", duration: "12.9" })], { duration: "12.9" }), expected);
  assert.equal(problems.length, 4);
  assert.match(problems.join("\n"), /324×576/);
  assert.match(problems.join("\n"), /codec is vp9/);
  assert.match(problems.join("\n"), /Decoded 389 video frames/);
  assert.match(problems.join("\n"), /duration 12\.9s/);
});

test("a missing video stream fails before any other check", () => {
  assert.deepEqual(verifyExportProbe(probeOf([]), expected), ["No video stream in the export."]);
});

test("audio is verified against the picture when supplied, and rejected when not", () => {
  const withAudio = { ...expected, audio: true };
  const good = probeOf([videoStream(), { codec_type: "audio", duration: "13.02" }]);
  assert.deepEqual(verifyExportProbe(good, withAudio), []);
  assert.match(verifyExportProbe(probeOf([videoStream()]), withAudio).join("\n"), /no audio stream/);
  assert.match(verifyExportProbe(probeOf([videoStream(), { codec_type: "audio", duration: "11.0" }]), withAudio).join("\n"), /does not match/);
  assert.match(verifyExportProbe(probeOf([videoStream(), { codec_type: "audio", duration: "13" }]), expected).join("\n"), /unexpectedly contains an audio stream/);
});

test("the partial file is a sibling of the requested output and never the same path", () => {
  assert.equal(partialPathFor("dist/hybrid.mp4"), "dist/hybrid.partial.mp4");
  assert.notEqual(partialPathFor("a.mp4"), "a.mp4");
});

test("segment plans cover the requested range exactly, with a short final segment", () => {
  assert.deepEqual(segmentPlan(0, 130, 60), [{ start: 0, frames: 60 }, { start: 60, frames: 60 }, { start: 120, frames: 10 }]);
  assert.deepEqual(segmentPlan(30, 60, 60), [{ start: 30, frames: 60 }]);
  const plan = segmentPlan(7, 14400, 1800);
  assert.equal(plan.length, 8);
  assert.equal(plan.reduce((sum, segment) => sum + segment.frames, 0), 14400);
  assert.equal(plan.at(-1).start + plan.at(-1).frames, 7 + 14400);
});

test("segment names include their frame range so a changed plan never reuses a stale file", () => {
  assert.equal(segmentFileName({ start: 60, frames: 60 }), "seg-60-60.mp4");
  assert.notEqual(segmentFileName({ start: 60, frames: 30 }), segmentFileName({ start: 60, frames: 60 }));
});

test("concat list escapes quotes so every segment path is read literally", () => {
  assert.equal(concatListText(["a b.mp4", "it's.mp4"]), "file 'a b.mp4'\nfile 'it'\\''s.mp4'\n");
});

test("concat arguments copy video and take audio from the full mix, with no per-segment AAC priming", () => {
  const args = ffmpegConcatArgs({ fps, listPath: "list.txt", outputPath: "o.partial.mp4", audioPath: "mix.wav", startSeconds: 2, frames: 60 });
  assert.equal(args[args.indexOf("-c:v") + 1], "copy");
  assert.deepEqual(args.slice(args.indexOf("-ss"), args.indexOf("-ss") + 4), ["-ss", "2", "-i", "mix.wav"]);
  assert.equal(args[args.indexOf("-c:a") + 1], "aac");
  assert.ok(!ffmpegConcatArgs({ fps, listPath: "list.txt", outputPath: "o.mp4", frames: 60 }).includes("-ss"));
});
