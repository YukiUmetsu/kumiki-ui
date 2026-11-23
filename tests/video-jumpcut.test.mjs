import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { formatSrt, jumpcutFilter, mapTime, parseArgs, parseSilences, parseSrt, retimeCues, speechSegments } from "../scripts/video-jumpcut.mjs";
import { PipelineError } from "../scripts/selective-color-core.mjs";

const code = (fn) => { try { fn(); } catch (error) { return error instanceof PipelineError ? error.code : "other"; } return "none"; };

test("reads its options", () => {
  const args = parseArgs(["talk.mp4", "--out=cut.mp4", "--punch=1.2", "--focus=0.4,0.3"]);
  assert.deepEqual([args.noise, args.minSilence, args.keep, args.punch, args.focus], [-35, .3, .08, 1.2, { x: .4, y: .3 }]);
  assert.equal(code(() => parseArgs(["talk.mp4"])), "usage");
  assert.equal(code(() => parseArgs(["talk.mp4", "--out=c.mp4", "--focus=2,1"])), "usage");
});

test("reads silences, keeps the speech between them with a breath, and changes framing only on long stretches", () => {
  const log = "[silencedetect] silence_start: 1.5\n[silencedetect] silence_end: 2.2 | silence_duration: 0.7\n[silencedetect] silence_start: 2.4\n[silencedetect] silence_end: 3.0\n[silencedetect] silence_start: 6.9";
  const silences = parseSilences(log, 8);
  assert.deepEqual(silences, [{ start: 1.5, end: 2.2 }, { start: 2.4, end: 3 }, { start: 6.9, end: 8 }]);
  const segments = speechSegments(silences, 8, .1);
  // 0–1.6 wide; a 0.4 s word at 2.1–2.5 keeps the wide framing; 2.9–7.0 is long enough to push in.
  assert.deepEqual(segments, [{ start: 0, end: 1.6, punch: false }, { start: 2.1, end: 2.5, punch: false }, { start: 2.9, end: 7, punch: true }]);
  // A click shorter than 0.15 s is dropped; stretches that touch are merged.
  assert.deepEqual(speechSegments([{ start: 1, end: 1.9 }, { start: 2, end: 3 }], 4, 0).map(s => [s.start, s.end]), [[0, 1], [3, 4]]);
  assert.deepEqual(speechSegments([{ start: 1, end: 1.05 }], 3, .1).map(s => [s.start, s.end]), [[0, 3]]);
});

test("maps source times into the cut and retimes captions", () => {
  const segments = [{ start: 0, end: 2, punch: false }, { start: 3, end: 5, punch: true }];
  assert.equal(mapTime(segments, 1), 1);
  assert.equal(mapTime(segments, 2.5), undefined);
  assert.equal(mapTime(segments, 4), 3);
  const cues = parseSrt("1\n00:00:00,500 --> 00:00:01,500\nOne\n\n2\n00:00:02,100 --> 00:00:02,800\n(pause)\n\n3\n00:00:02,500 --> 00:00:04,000\nTwo\nlines\n");
  assert.equal(cues.length, 3);
  const retimed = retimeCues(cues, segments);
  assert.deepEqual(retimed.map(c => [c.start, c.end, c.text]), [[.5, 1.5, "One"], [2, 3, "Two\nlines"]]);
  assert.equal(formatSrt(retimed).split("\n")[1], "00:00:00,500 --> 00:00:01,500");
  // Each stretch is trimmed and faded; the pushed ones are cropped about the focus and scaled back.
  const filter = jumpcutFilter(segments, { width: 960, height: 540, punch: 1.12, focus: { x: .5, y: .38 } });
  assert.match(filter, /\[0:v\]trim=start=3:end=5,setpts=PTS-STARTPTS,crop=iw\/1\.12:ih\/1\.12:\(iw-iw\/1\.12\)\*0\.5:\(ih-ih\/1\.12\)\*0\.38,scale=960:540/);
  assert.match(filter, /afade=t=out:st=1\.9900:d=0\.01/);
  assert.match(filter, /concat=n=2:v=1:a=1\[v\]\[a\]$/);
});

const ffmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;
test("cuts the pauses out of a test clip and retimes its captions", { skip: !ffmpeg && "FFmpeg is not installed" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "km-jumpcut-test-")), clip = join(dir, "talk.mp4");
  try {
    // A tone that stops for a second twice: speech, pause, speech, pause, speech.
    const made = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=s=160x96:r=30:d=6", "-f", "lavfi", "-i", "sine=frequency=300:duration=6",
      "-af", "volume=enable='between(t,1.5,2.5)+between(t,4,5)':volume=0", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", clip]);
    assert.equal(made.status, 0, String(made.stderr));
    writeFileSync(join(dir, "talk.srt"), "1\n00:00:00,200 --> 00:00:01,400\nfirst\n\n2\n00:00:02,600 --> 00:00:03,800\nsecond\n");
    const ran = spawnSync("node", ["scripts/video-jumpcut.mjs", clip, `--out=${join(dir, "cut.mp4")}`, `--srt=${join(dir, "talk.srt")}`, "--keep=0", "--format=json", "--log=error"], { encoding: "utf8" });
    assert.equal(ran.status, 0, ran.stderr);
    const report = JSON.parse(ran.stdout);
    assert.equal(report.cuts, 2);
    assert.ok(Math.abs(report.removedSeconds - 2) < .15, `removed ${report.removedSeconds}`);
    const duration = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(dir, "cut.mp4")], { encoding: "utf8" }).stdout);
    assert.ok(Math.abs(duration - 4) < .2, `duration ${duration}`);
    const srt = parseSrt(readFileSync(join(dir, "cut.srt"), "utf8"));
    assert.deepEqual(srt.map(c => c.text), ["first", "second"]);
    assert.ok(Math.abs(srt[1].start - 1.6) < .1, `second caption at ${srt[1].start}`);
    const error = JSON.parse(spawnSync("node", ["scripts/video-jumpcut.mjs", join(dir, "none.mp4"), `--out=${join(dir, "x.mp4")}`, "--format=json"], { encoding: "utf8" }).stdout).error.code;
    assert.equal(error, "file-missing");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
