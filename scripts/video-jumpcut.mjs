#!/usr/bin/env node
/**
 * Jump cuts for talking heads (VE1.10): the pauses taken out, and every other stretch of speech pushed in, so each cut reads as a
 * new angle instead of a jump.
 *
 *   npm run video:jumpcut -- <talk.mp4> --out=<cut.mp4> [--from=<s|Nf>] [--to=<s|Nf>] [--noise=-35] [--min-silence=0.3]
 *     [--keep=0.08] [--punch=1.12] [--focus=0.5,0.38] [--srt=<captions.srt>] [--report=<segments.json>] [--crf=18] [--overwrite] [--log=info] [--format=json]
 *
 * 1. FFmpeg's `silencedetect` finds every stretch quieter than `--noise` dB for at least `--min-silence` seconds.
 * 2. The speech between them is kept, with `--keep` seconds of each pause left at both ends, so breaths and word endings are not
 *    clipped; stretches shorter than 0.15 s (clicks, a cough) are dropped, and kept stretches that touch are merged.
 * 3. Every other stretch is pushed in by `--punch` about `--focus` (fractions of the frame; default a face in a medium shot); a stretch
 *    under 0.5 s keeps the framing before it, so the picture never flicks in and out. The jump
 *    between two stretches then reads as a cut to a tighter angle, the editing habit of short-form talking heads. `--punch=1` turns it
 *    off. Each cut gets a 10 ms audio fade, so it never clicks.
 * 4. The stretches are joined (concat) and encoded. `--report` writes the stretches and a time map: `mapTime` moves a time in the source
 *    (a caption's start) to its time in the cut, or reports it removed. `--srt` retimes a subtitle file of the source (its times
 *    from the start of the range) into `<out>.srt`: a caption that falls wholly inside a removed pause is dropped.
 *
 * Practice: cutting the pauses out of talking heads and "punching in" on alternate cuts is the retention editing of short-form video;
 * MrBeast's team cut to 23 to 38 cuts a minute ([Tubefilter](https://www.tubefilter.com/2024/03/04/mrbeast-editing-style-number-of-cuts-per-video/amp/)).
 * Errors carry a code: usage, file-missing, probe-failed, ffmpeg-missing, no-audio, time-range, output-exists, no-speech, encode-failed.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createLogger, frameRange, outputCodec, parseProbe, PipelineError } from "./selective-color-core.mjs";

const FLAGS = ["out", "from", "to", "noise", "min-silence", "keep", "punch", "focus", "srt", "report", "crf", "log", "format"];
const USAGE = "Usage: npm run video:jumpcut -- <talk.mp4> --out=<cut.mp4> [--from=] [--to=] [--noise=-35] [--min-silence=0.3] [--keep=0.08] [--punch=1.12] [--focus=0.5,0.38] [--srt=] [--report=] [--crf=] [--overwrite] [--log=] [--format=json]";
/** Kept stretches shorter than this are a click or a cough, not speech; shorter than `MIN_FRAMING`, a stretch keeps the framing before it. */
const MIN_SPEECH = .15, MIN_FRAMING = .5;

export function parseArgs(argv) {
  const flags = {}, files = [];
  for (const arg of argv) {
    const m = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!m) { files.push(arg); continue; }
    if (m[2] === undefined && m[1] === "overwrite") flags.overwrite = true;
    else if (FLAGS.includes(m[1]) && m[2] !== undefined) flags[m[1]] = m[2];
    else throw new PipelineError("usage", `Unknown option ${arg}.`, USAGE);
  }
  if (files.length !== 1 || !flags.out) throw new PipelineError("usage", "A video and --out are needed.", USAGE);
  const number = (name, fallback, lo, hi) => { const v = flags[name] === undefined ? fallback : Number(flags[name]); if (!(Number.isFinite(v) && v >= lo && v <= hi)) throw new PipelineError("usage", `--${name} runs from ${lo} to ${hi}.`); return v; };
  const focus = (flags.focus ?? "0.5,0.38").split(",").map(Number);
  if (focus.length !== 2 || !focus.every(v => v >= 0 && v <= 1)) throw new PipelineError("usage", "--focus is two fractions of the frame, x,y.");
  return { input: resolve(files[0]), out: resolve(flags.out), from: flags.from, to: flags.to, noise: number("noise", -35, -80, -10), minSilence: number("min-silence", .3, .1, 5),
    keep: number("keep", .08, 0, .5), punch: number("punch", 1.12, 1, 1.6), focus: { x: focus[0], y: focus[1] }, srt: flags.srt && resolve(flags.srt), report: flags.report && resolve(flags.report),
    crf: number("crf", 18, 0, 51), overwrite: Boolean(flags.overwrite), log: flags.log ?? "info", format: flags.format };
}

/** Silences from `silencedetect`'s log, in seconds from the start of what it measured. A silence still open at the end runs to `end`. */
export function parseSilences(stderr, end) {
  const out = [];
  let open;
  for (const line of stderr.split("\n")) {
    const start = /silence_start: (-?[0-9.]+)/.exec(line), stop = /silence_end: ([0-9.]+)/.exec(line);
    if (start) open = Math.max(0, Number(start[1]));
    if (stop && open !== undefined) { out.push({ start: open, end: Number(stop[1]) }); open = undefined; }
  }
  if (open !== undefined) out.push({ start: open, end });
  return out;
}

/** The stretches of speech to keep, in seconds within [0, duration]: the gaps between silences, each padded by `keep`, merged when they
 * touch, short ones dropped; every other one marked to punch in. */
export function speechSegments(silences, duration, keep = .08) {
  const raw = [];
  let at = 0;
  for (const silence of silences) {
    if (silence.start > at) raw.push({ start: Math.max(0, at - keep), end: Math.min(duration, silence.start + keep) });
    at = Math.max(at, silence.end);
  }
  if (at < duration) raw.push({ start: Math.max(0, at - keep), end: duration });
  const merged = [];
  for (const segment of raw) {
    const last = merged[merged.length - 1];
    if (last && segment.start <= last.end) last.end = Math.max(last.end, segment.end);
    else merged.push({ ...segment });
  }
  // The framing changes only on stretches long enough to read: a short one (a single word) keeps the framing before it, so the picture
  // never flicks in and out within half a second.
  let punch = true;
  return merged.filter(segment => segment.end - segment.start >= MIN_SPEECH).map(segment => {
    if (segment.end - segment.start >= MIN_FRAMING) punch = !punch;
    return { start: Number(segment.start.toFixed(4)), end: Number(segment.end.toFixed(4)), punch };
  });
}

/** Where a time in the source lands in the cut, or `undefined` if it was cut out. */
export function mapTime(segments, time) {
  let before = 0;
  for (const segment of segments) {
    if (time < segment.start) return undefined;
    if (time <= segment.end) return Number((before + time - segment.start).toFixed(4));
    before += segment.end - segment.start;
  }
  return undefined;
}

/** A time moved into the cut, clamped onto what was kept: forward to the next kept stretch, or back to the end of the last one. */
function clampTo(segments, time, forward) {
  const inside = mapTime(segments, time);
  if (inside !== undefined) return inside;
  if (forward) { const next = segments.find(segment => segment.start > time); return next ? mapTime(segments, next.start) : undefined; }
  const previous = [...segments].reverse().find(segment => segment.end < time);
  return previous ? mapTime(segments, previous.end) : undefined;
}
/** Subtitle cues (seconds) retimed into the cut; a cue left with no time on screen is dropped. */
export function retimeCues(cues, segments) {
  return cues.flatMap(cue => {
    const start = clampTo(segments, cue.start, true), end = clampTo(segments, cue.end, false);
    return start !== undefined && end !== undefined && end - start > .05 ? [{ ...cue, start, end }] : [];
  });
}
const SRT_TIME = /(\d+):(\d+):(\d+)[,.](\d+)/;
const srtSeconds = (text) => { const m = SRT_TIME.exec(text); return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4].padEnd(3, "0").slice(0, 3)) / 1000; };
const srtTime = (t) => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
/** The cues of an SRT file. */
export function parseSrt(text) {
  return text.replace(/\r/g, "").split(/\n{2,}/).flatMap(block => {
    const lines = block.trim().split("\n"), at = lines.findIndex(line => line.includes("-->"));
    if (at < 0) return [];
    const [from, to] = lines[at].split("-->");
    return [{ start: srtSeconds(from), end: srtSeconds(to), text: lines.slice(at + 1).join("\n") }];
  });
}
/** Cues as an SRT file. */
export const formatSrt = (cues) => cues.map((cue, k) => `${k + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${cue.text}\n`).join("\n");

/** The filter graph that trims each stretch, pushes in the marked ones about `focus` by `punch`, fades its audio ends and joins them. */
export function jumpcutFilter(segments, { width, height, punch, focus }) {
  const parts = segments.map((segment, k) => {
    const { start, end } = segment, d = Math.max(.02, end - start), push = segment.punch && punch > 1;
    const crop = push ? `,crop=iw/${punch}:ih/${punch}:(iw-iw/${punch})*${focus.x}:(ih-ih/${punch})*${focus.y},scale=${width}:${height}:flags=lanczos,setsar=1` : "";
    return `[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS${crop}[v${k}];`
      + `[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=${(d - .01).toFixed(4)}:d=0.01[a${k}];`;
  });
  return parts.join("") + segments.map((_, k) => `[v${k}][a${k}]`).join("") + `concat=n=${segments.length}:v=1:a=1[v][a]`;
}

function run(args, code, what) {
  const r = spawnSync("ffmpeg", args, { encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.error) throw new PipelineError("ffmpeg-missing", "FFmpeg could not run: " + r.error.message, "Install FFmpeg.");
  if (r.status !== 0) throw new PipelineError(code, `FFmpeg could not ${what}: ` + (r.stderr ?? "").trim().split("\n").pop());
  return r.stderr ?? "";
}

async function main() {
  const args = parseArgs(process.argv.slice(2)), log = createLogger(args.log, undefined, "video-jumpcut"), started = Date.now();
  if (!existsSync(args.input) || statSync(args.input).isDirectory()) throw new PipelineError("file-missing", `There is no video at ${args.input}.`);
  if (existsSync(args.out) && !args.overwrite) throw new PipelineError("output-exists", `${args.out} already exists.`, "Pass --overwrite to replace it.");
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", args.input], { encoding: "utf8", maxBuffer: 16 << 20 });
  if (probe.error) throw new PipelineError("ffmpeg-missing", "ffprobe could not run: " + probe.error.message, "Install FFmpeg.");
  if (probe.status !== 0) throw new PipelineError("probe-failed", `ffprobe could not read ${args.input}.`);
  const info = parseProbe(JSON.parse(probe.stdout), args.input), range = frameRange(info, args.from, args.to), codec = outputCodec(args.out);
  if (!info.audio) throw new PipelineError("no-audio", `${args.input} has no sound to find the pauses in.`);
  for (const warning of range.warnings) log.warn(warning);
  const seconds = frames => frames * info.fps.den / info.fps.num, start = seconds(range.start), duration = seconds(range.count);
  const detect = run(["-v", "info", "-nostats", "-ss", start.toFixed(6), "-t", duration.toFixed(6), "-i", info.file, "-vn", "-af", `silencedetect=noise=${args.noise}dB:d=${args.minSilence}`, "-f", "null", "-"], "probe-failed", "measure the pauses");
  const silences = parseSilences(detect, duration), segments = speechSegments(silences, duration, args.keep);
  if (!segments.length) throw new PipelineError("no-speech", `Nothing above ${args.noise} dB was found.`, "Lower --noise (for example -45) for a quiet recording.");
  const kept = segments.reduce((sum, segment) => sum + segment.end - segment.start, 0);
  log.info(`Keeping ${segments.length} stretches (${kept.toFixed(1)} s of ${duration.toFixed(1)} s); ${segments.length - 1} cuts.`);
  run(["-v", "error", "-y", "-ss", start.toFixed(6), "-t", duration.toFixed(6), "-i", info.file, "-filter_complex", jumpcutFilter(segments, { width: info.width, height: info.height, punch: args.punch, focus: args.focus }),
    "-map", "[v]", "-map", "[a]", "-c:v", codec.encoder, "-pix_fmt", codec.pixelFormat, ...codec.quality(args.crf), "-c:a", codec.container === "webm" ? "libopus" : "aac", "-b:a", "192k",
    ...codec.container === "mp4" ? ["-movflags", "+faststart"] : [], args.out], "encode-failed", "write the cut");
  const report = { input: args.input, out: args.out, sourceSeconds: Number(duration.toFixed(3)), keptSeconds: Number(kept.toFixed(3)), removedSeconds: Number((duration - kept).toFixed(3)),
    cuts: segments.length - 1, cutsPerMinute: Number(((segments.length - 1) / (kept / 60)).toFixed(1)), segments, seconds: (Date.now() - started) / 1000 };
  if (args.report) writeFileSync(args.report, JSON.stringify({ sourceStart: Number(start.toFixed(4)), segments }, null, 1) + "\n");
  if (args.srt) {
    if (!existsSync(args.srt)) throw new PipelineError("file-missing", `There is no subtitle file at ${args.srt}.`);
    const cues = parseSrt(readFileSync(args.srt, "utf8")), retimed = retimeCues(cues, segments);
    writeFileSync(args.out.replace(/\.[a-z0-9]+$/i, "") + ".srt", formatSrt(retimed));
    report.captions = { in: cues.length, out: retimed.length };
  }
  if (args.format === "json") process.stdout.write(JSON.stringify(report) + "\n");
  else log.info(`Wrote ${args.out}: ${report.removedSeconds} s of pauses removed, ${report.cutsPerMinute} cuts a minute.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    const json = process.argv.includes("--format=json"), code = error instanceof PipelineError ? error.code : "internal";
    if (json) process.stdout.write(JSON.stringify({ error: { code, message: error.message, hint: error.hint } }) + "\n");
    else process.stderr.write(`[video-jumpcut] error (${code}): ${error.message}${error.hint ? `\n  ${error.hint}` : ""}\n`);
    process.exit(1);
  });
}
