import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { decodeArgs, encodeArgs, frameRange, outputCodec, parseCodecList, parseProbe, PipelineError } from "../scripts/selective-color-core.mjs";

const probe = (extra = {}) => ({ streams: [{ codec_type: "video", codec_name: "h264", width: 1920, height: 1080, avg_frame_rate: "30000/1001", r_frame_rate: "30000/1001", pix_fmt: "yuv420p", duration: "4.004", ...extra }, { codec_type: "audio" }], format: { duration: "4.004" } });
const code = (fn) => { try { fn(); } catch (error) { return error instanceof PipelineError ? error.code : "other"; } return "none"; };

test("reads a probe: size, rational rate, rotation, audio", () => {
  const info = parseProbe(probe(), "a.mp4");
  assert.deepEqual([info.width, info.height, info.fps.num, info.fps.den, info.audio], [1920, 1080, 30000, 1001, true]);
  // A phone clip stored sideways is decoded upright, so its frames are taller than wide.
  const sideways = parseProbe(probe({ side_data_list: [{ rotation: -90 }] }), "b.mp4");
  assert.deepEqual([sideways.width, sideways.height], [1080, 1920]);
  assert.equal(parseProbe(probe({ avg_frame_rate: "29/1", r_frame_rate: "30/1" }), "c.mp4").variableFrameRate, true);
  assert.equal(code(() => parseProbe({ streams: [{ codec_type: "audio" }] }, "song.mp3")), "no-video-stream");
});

test("lists codecs and matches output codecs to containers", () => {
  const names = parseCodecList(" V....D libx264              libx264 H.264\n A....D aac                  AAC\n ------\n");
  assert.ok(names.has("libx264") && names.has("aac"));
  assert.equal(outputCodec("out.mp4").encoder, "libx264");
  assert.equal(outputCodec("out.webm").codec, "vp9");
  assert.equal(code(() => outputCodec("out.mp4", "prores")), "container-codec");
  assert.equal(code(() => outputCodec("out.mp4", "gif")), "codec-unknown");
});

test("works out frame ranges, clamping or refusing times past the video", () => {
  const info = parseProbe(probe(), "a.mp4");
  assert.deepEqual(frameRange(info), { start: 0, end: 120, count: 120, warnings: [] });
  assert.equal(frameRange(info, "1", "45f").start, 30);
  assert.equal(frameRange(info, "1", "45f").count, 15);
  const clamped = frameRange(info, "2", "9");
  assert.equal(clamped.end, 120);
  assert.equal(clamped.warnings.length, 1);
  assert.equal(code(() => frameRange(info, "2", "9", "error")), "time-range");
  assert.equal(code(() => frameRange(info, "3", "2")), "time-empty");
  assert.equal(code(() => frameRange(info, "soon")), "time-invalid");
});

test("builds FFmpeg arguments that keep the source's rate and audio", () => {
  const info = parseProbe(probe(), "a.mp4"), range = frameRange(info, "1", "2");
  const decode = decodeArgs(info, range.start, range.count).join(" ");
  assert.match(decode, /-ss 1\.00\d+ -i a\.mp4/);
  assert.match(decode, /fps=30000\/1001.*-frames:v 30 -f rawvideo -pix_fmt rgba/);
  const encode = encodeArgs(info, "out.mp4", outputCodec("out.mp4"), range).join(" ");
  assert.match(encode, /-s 1920x1080 -r 30000\/1001 -i pipe:0/);
  assert.match(encode, /-map 1:a:0\? -c:a aac/);
  assert.doesNotMatch(encodeArgs(info, "out.mp4", outputCodec("out.mp4"), range, { audio: false }).join(" "), /1:a:0/);
});

const ffmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;
test("processes a real clip and reports what went wrong with bad input", { skip: !ffmpeg && "FFmpeg is not installed" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "km-sc-test-")), clip = join(dir, "card.mp4"), cfg = join(dir, "cfg.json");
  try {
    // Grey with a red box and a blue box, two seconds, with a tone; the effect is on from 0.5 to 1.5 s.
    const made = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=gray:s=160x96:r=30:d=2,drawbox=x=16:y=16:w=48:h=48:color=red@1:t=fill,drawbox=x=96:y=16:w=48:h=48:color=blue@1:t=fill",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", clip]);
    assert.equal(made.status, 0, String(made.stderr));
    writeFileSync(cfg, JSON.stringify({ targets: [{ color: "#ff0000" }], windows: [{ start: 0.5, end: 1.5, transition: 0.25 }] }));
    const cli = (...args) => spawnSync("node", ["scripts/selective-color.mjs", ...args, "--format=json", "--log=error"], { encoding: "utf8" });
    const ran = cli(clip, `--config=${cfg}`, `--out=${join(dir, "out.mp4")}`, "--workers=2");
    assert.equal(ran.status, 0, ran.stderr);
    const report = JSON.parse(ran.stdout);
    assert.equal(report.frames, 60);
    assert.equal(report.audio, true);
    const pixel = (t, x, y) => { const raw = spawnSync("ffmpeg", ["-v", "error", "-ss", String(t), "-i", join(dir, "out.mp4"), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]).stdout; return [...raw.subarray(3 * (x + y * 160), 3 * (x + y * 160) + 3)]; };
    const [r0, g0, b0] = pixel(0.2, 40, 40), [r1, g1, b1] = pixel(1, 40, 40), [rb, gb, bb] = pixel(1, 120, 40);
    assert.ok(Math.abs(r0 - g0) < 8 && Math.abs(g0 - b0) < 8, "before the window the red box is grey");
    assert.ok(r1 > 200 && g1 < 40 && b1 < 40, "inside the window the red box keeps its colour");
    assert.ok(Math.abs(rb - gb) < 8 && Math.abs(gb - bb) < 8, "the blue box is grey");
    // Bad input: each failure has its own code.
    const error = (...args) => JSON.parse(cli(...args).stdout).error.code;
    assert.equal(error(join(dir, "missing.mp4"), `--config=${cfg}`, `--out=${join(dir, "x.mp4")}`), "file-missing");
    assert.equal(error(cfg, `--config=${cfg}`, `--out=${join(dir, "x.mp4")}`), "probe-failed");
    assert.equal(error(clip, `--config=${join(dir, "none.json")}`, `--out=${join(dir, "x.mp4")}`), "config-missing");
    assert.equal(error(clip, `--config=${cfg}`, `--out=${join(dir, "out.mp4")}`), "output-exists");
    writeFileSync(cfg, JSON.stringify({ targets: [{ color: "red" }] }));
    assert.equal(error(clip, `--config=${cfg}`, `--out=${join(dir, "y.mp4")}`), "config-invalid");
    writeFileSync(cfg, JSON.stringify({ targets: [{ color: "#ff0000" }], outOfRange: "error" }));
    assert.equal(error(clip, `--config=${cfg}`, `--out=${join(dir, "y.mp4")}`, "--to=9"), "time-range");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
