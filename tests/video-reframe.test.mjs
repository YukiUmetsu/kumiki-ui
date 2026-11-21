import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { outputSize, parseArgs, parseAspect } from "../scripts/video-reframe.mjs";
import { PipelineError } from "../scripts/selective-color-core.mjs";

const code = (fn) => { try { fn(); } catch (error) { return error instanceof PipelineError ? error.code : "other"; } return "none"; };

test("reads its options and refuses what it cannot do", () => {
  const args = parseArgs(["clip.mp4", "--cutout=cut.webm", "--out=tall.mp4", "--aspect=4:5", "--motion=faster"]);
  assert.deepEqual([args.aspect, args.mode, args.motion, args.padding, args.crf], [.8, "auto", "faster", .06, 18]);
  assert.equal(parseAspect("9:16"), 9 / 16);
  assert.equal(parseAspect("1"), 1);
  assert.equal(code(() => parseArgs(["clip.mp4", "--out=a.mp4"])), "usage");
  assert.equal(code(() => parseArgs(["clip.mp4", "--cutout=c.webm", "--out=a.mp4", "--aspect=9:0"])), "usage");
  assert.equal(code(() => parseArgs(["clip.mp4", "--cutout=c.webm", "--out=a.mp4", "--mode=drone"])), "usage");
  assert.equal(code(() => parseArgs(["clip.mp4", "--cutout=c.webm", "--out=a.mp4", "--height=99.5"])), "usage");
  assert.deepEqual(outputSize({ width: 303.75, height: 540 }), { width: 304, height: 540 });
  assert.deepEqual(outputSize({ width: 303.75, height: 540 }, 1920), { width: 1080, height: 1920 });
});

const ffmpeg = spawnSync("ffmpeg", ["-version"]).status === 0 && /libvpx/.test(spawnSync("ffmpeg", ["-hide_banner", "-encoders"], { encoding: "utf8" }).stdout);
test("follows a box that crosses a wide card in a tall crop", { skip: !ffmpeg && "FFmpeg with libvpx is not installed" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "km-reframe-test-")), clip = join(dir, "card.mp4"), cutout = join(dir, "cut.webm"), out = join(dir, "tall.mp4"), track = join(dir, "track.json");
  try {
    // A white box crossing a grey card from left to right in 2 s, and its cutout: the same box, solid, on a clear ground.
    const box = "color=c=white:s=24x60:r=30:d=2", motion = "x='10+t*130':y=50";
    let made = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `color=c=gray:s=320x180:r=30:d=2[bg];${box}[box];[bg][box]overlay=${motion}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", clip]);
    assert.equal(made.status, 0, String(made.stderr));
    made = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `color=c=black@0.0:s=320x180:r=30:d=2,format=rgba[bg];${box},format=rgba[box];[bg][box]overlay=${motion}:format=auto,format=yuva420p`,
      "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", "-b:v", "0", "-crf", "30", cutout]);
    assert.equal(made.status, 0, String(made.stderr));
    const ran = spawnSync("node", ["scripts/video-reframe.mjs", clip, `--cutout=${cutout}`, `--out=${out}`, `--track=${track}`, "--format=json", "--log=error"], { encoding: "utf8" });
    assert.equal(ran.status, 0, ran.stderr);
    const report = JSON.parse(ran.stdout);
    assert.equal(report.mode, "panning");
    assert.deepEqual(report.output, { width: 102, height: 180 });
    assert.equal(report.frames, 60);
    // The box stays in the tall picture: the brightest column of each frame is never near an edge.
    const pixels = spawnSync("ffmpeg", ["-v", "error", "-i", out, "-f", "rawvideo", "-pix_fmt", "gray", "pipe:1"], { maxBuffer: 64 << 20 }).stdout, size = 102 * 180;
    assert.equal(pixels.length, 60 * size);
    for (let f = 0; f < 60; f += 5) {
      let best = 0, at = 0;
      for (let x = 0; x < 102; x++) { let sum = 0; for (let y = 60; y < 100; y++) sum += pixels[f * size + y * 102 + x]; if (sum > best) { best = sum; at = x; } }
      assert.ok(at > 10 && at < 92, `frame ${f}: the box is at column ${at}`);
    }
    const written = JSON.parse(readFileSync(track, "utf8"));
    assert.equal(written.rows.length, 60);
    assert.ok(Math.abs(written.rows[30][4] - (10 + 1 * 130 + 12)) < 4, `centre ${written.rows[30][4]}`);
    const error = JSON.parse(spawnSync("node", ["scripts/video-reframe.mjs", clip, `--cutout=${join(dir, "none.webm")}`, `--out=${join(dir, "x.mp4")}`, "--format=json"], { encoding: "utf8" }).stdout).error.code;
    assert.equal(error, "file-missing");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
