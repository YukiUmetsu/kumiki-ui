import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { interpolateFilter, parseArgs, parseSsim, slowmoArgs } from "../scripts/video-slowmo.mjs";
import { frameRange, outputCodec, parseProbe, PipelineError } from "../scripts/selective-color-core.mjs";

const code = (fn) => { try { fn(); } catch (error) { return error instanceof PipelineError ? error.code : "other"; } return "none"; };

test("reads its options and refuses what it cannot do", () => {
  const args = parseArgs(["clip.mp4", "--out=slow.mp4", "--factor=4", "--check"]);
  assert.deepEqual([args.factor, args.method, args.check, args.crf], [4, "mci", true, 18]);
  assert.equal(code(() => parseArgs(["clip.mp4"])), "usage");
  assert.equal(code(() => parseArgs(["clip.mp4", "--out=a.mp4", "--factor=12"])), "usage");
  assert.equal(code(() => parseArgs(["clip.mp4", "--out=a.mp4", "--method=magic"])), "usage");
});

test("builds the interpolation and stretches it back to the source's rate", () => {
  assert.equal(interpolateFilter("mci", { num: 30000, den: 1001 }, 4), "minterpolate=fps=120000/1001:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1");
  assert.equal(interpolateFilter("blend", { num: 30, den: 1 }, 2), "framerate=fps=60/1");
  const info = parseProbe({ streams: [{ codec_type: "video", codec_name: "h264", width: 960, height: 540, avg_frame_rate: "30/1", r_frame_rate: "30/1", duration: "4" }], format: { duration: "4" } }, "a.mp4");
  const args = slowmoArgs(info, frameRange(info, "1", "2"), { method: "mci", factor: 4, crf: 18, out: "slow.mp4" }, outputCodec("slow.mp4")).join(" ");
  assert.match(args, /-ss 1\.000000 -t 1\.000000 -i a\.mp4/);
  assert.match(args, /minterpolate=fps=120\/1.*setpts=4\*PTS -r 30\/1/);
  assert.match(args, /-an/);
  assert.equal(parseSsim("[Parsed_ssim_2] SSIM Y:0.95 U:0.97 V:0.97 All:0.958120 (13.8)"), .95812);
  assert.equal(code(() => parseSsim("nothing")), "check-failed");
});

const ffmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;
test("slows a moving test card, and its check finds motion interpolation beats repeating frames", { skip: !ffmpeg && "FFmpeg is not installed" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "km-slowmo-test-")), clip = join(dir, "card.mp4");
  try {
    // A box gliding across a still card at a steady speed: what interpolation is for.
    const made = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=gray:s=160x96:r=30:d=2[bg];color=c=white:s=20x36:r=30:d=2[box];[bg][box]overlay=x='t*60':y=30", "-c:v", "libx264", "-pix_fmt", "yuv420p", clip]);
    assert.equal(made.status, 0, String(made.stderr));
    const ran = spawnSync("node", ["scripts/video-slowmo.mjs", clip, `--out=${join(dir, "slow.mp4")}`, "--factor=2", "--check", "--format=json", "--log=error"], { encoding: "utf8" });
    assert.equal(ran.status, 0, ran.stderr);
    const report = JSON.parse(ran.stdout);
    assert.ok(report.frames >= 2 * 60 - 4 && report.frames <= 2 * 60, `frames ${report.frames}`);
    assert.ok(report.check.ssim > report.check.repeat, JSON.stringify(report.check));
    const error = JSON.parse(spawnSync("node", ["scripts/video-slowmo.mjs", join(dir, "none.mp4"), `--out=${join(dir, "x.mp4")}`, "--format=json"], { encoding: "utf8" }).stdout).error.code;
    assert.equal(error, "file-missing");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
