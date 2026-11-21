import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { assembleMosh, parseArgs, splitVops, vopType } from "../scripts/video-datamosh.mjs";
import { PipelineError } from "../scripts/selective-color-core.mjs";

const code = (fn) => { try { fn(); } catch (error) { return error instanceof PipelineError ? error.code : "other"; } return "none"; };
/** A tiny raw MPEG-4 stream: a header, then VOPs whose coding type sits in the top two bits after the start code. */
const stream = (...types) => Buffer.concat([Buffer.from([0, 0, 1, 0xB0, 1, 0, 0, 1, 0x20, 9]), ...types.map((t, k) => Buffer.from([0, 0, 1, 0xB6, "IPBS".indexOf(t) << 6, k]))]);

test("reads its options", () => {
  const args = parseArgs(["a.mp4", "b.mp4", "--out=m.mp4", "--bloom=6"]);
  assert.deepEqual([args.mosh, args.bloom, args.width, args.quality, args.crf], [24, 6, 960, 3, 18]);
  assert.equal(code(() => parseArgs(["a.mp4", "--out=m.mp4"])), "usage");
  assert.equal(code(() => parseArgs(["a.mp4", "b.mp4", "--out=m.mp4", "--bloom=200"])), "usage");
});

test("splits a stream at its pictures, and drops only the second clip's first keyframe", () => {
  const { header, vops } = splitVops(stream("I", "P", "P"));
  assert.equal(header.length, 10);
  assert.deepEqual(vops.map(vopType), ["I", "P", "P"]);
  const mosh = assembleMosh(stream("I", "P", "P"), stream("I", "P", "P", "I", "P"), 2);
  // The first clip's 3 pictures, its first motion twice more, then the second clip after its keyframe: 3 + 2 + 4.
  assert.equal(mosh.frames, 9);
  assert.deepEqual(splitVops(mosh.stream).vops.map(vopType), ["I", "P", "P", "P", "P", "P", "P", "I", "P"]);
  assert.deepEqual([mosh.moshAt, mosh.recoverAt], [3, 7]);
  assert.equal(code(() => assembleMosh(stream("I", "P"), stream("P", "P"))), "stream-failed");
  assert.equal(code(() => assembleMosh(stream("I", "P"), stream("I", "P", "B"))), "stream-failed");
  assert.equal(code(() => splitVops(Buffer.from([1, 2, 3]))), "stream-failed");
});

const ffmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;
test("moshes two test cards: the second card's motion moves the first one's picture until its keyframe", { skip: !ffmpeg && "FFmpeg is not installed" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "km-mosh-test-"));
  try {
    const card = (file, color, speed) => spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `color=c=${color}:s=160x96:r=30:d=1[bg];testsrc2=s=48x48:r=30:d=1[box];[bg][box]overlay=x='t*${speed}':y=24`, "-c:v", "libx264", "-pix_fmt", "yuv420p", file]);
    assert.equal(card(join(dir, "a.mp4"), "navy", 40).status, 0);
    assert.equal(card(join(dir, "b.mp4"), "olive", 90).status, 0);
    const ran = spawnSync("node", ["scripts/video-datamosh.mjs", join(dir, "a.mp4"), join(dir, "b.mp4"), `--out=${join(dir, "m.mp4")}`, "--width=160", "--mosh=12", "--format=json", "--log=error"], { encoding: "utf8" });
    assert.equal(ran.status, 0, ran.stderr);
    const report = JSON.parse(ran.stdout);
    assert.deepEqual([report.frames, report.moshAt, report.recoverAt], [59, 30, 41]);
    // Mid-mosh the frame still carries the first card's navy, not the second's olive; once the keyframe lands it is olive.
    const pixel = (n) => { const raw = spawnSync("ffmpeg", ["-v", "error", "-i", join(dir, "m.mp4"), "-vf", `select=eq(n\\,${n})`, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]).stdout; return [...raw.subarray(3 * (5 + 80 * 160), 3 * (5 + 80 * 160) + 3)]; };
    const [r1, , b1] = pixel(35), [r2, g2, b2] = pixel(50);
    assert.ok(b1 > r1, `mid-mosh still navy: ${pixel(35)}`);
    assert.ok(r2 > b2 && g2 > b2, `recovered to olive: ${[r2, g2, b2]}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
