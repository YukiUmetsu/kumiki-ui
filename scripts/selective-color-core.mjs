/**
 * The file pipeline of the selective colour engine (VP1.3), as testable pieces: probe parsing, codec checks, frame
 * ranges, FFmpeg arguments and coded errors. `scripts/selective-color.mjs` runs them; nothing here starts a process.
 */

/** A pipeline failure with a code a caller can act on. */
export class PipelineError extends Error {
  constructor(code, message, hint) {
    super(message);
    this.name = "PipelineError";
    this.code = code;
    this.hint = hint;
  }
}

const rate = (value) => {
  const [num, den] = String(value ?? "0/0").split("/").map(Number);
  return den > 0 && num > 0 ? { num, den } : undefined;
};

/** The facts the pipeline needs from `ffprobe -show_streams -show_format -of json`. */
export function parseProbe(json, file) {
  const streams = json?.streams ?? [], video = streams.find((s) => s.codec_type === "video" && !(s.disposition?.attached_pic));
  if (!video) throw new PipelineError("no-video-stream", `${file} has no video stream.`, "Give a video file, not audio or an image.");
  const fps = rate(video.avg_frame_rate) ?? rate(video.r_frame_rate);
  if (!fps) throw new PipelineError("no-frame-rate", `${file} has no usable frame rate.`);
  // A phone video may be stored sideways with a rotation flag; FFmpeg turns it upright while decoding.
  const rotation = Number(video.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? video.tags?.rotate ?? 0);
  const sideways = Math.abs(rotation) % 180 === 90;
  const width = sideways ? video.height : video.width, height = sideways ? video.width : video.height;
  if (!(width > 0 && height > 0)) throw new PipelineError("no-frame-size", `${file} has no frame size.`);
  const duration = Number(video.duration ?? json.format?.duration);
  const variable = video.avg_frame_rate && video.r_frame_rate && video.avg_frame_rate !== video.r_frame_rate;
  return {
    file, width, height, fps, fpsValue: fps.num / fps.den, duration: Number.isFinite(duration) ? duration : undefined,
    codec: video.codec_name, pixelFormat: video.pix_fmt, rotation, variableFrameRate: Boolean(variable),
    audio: streams.some((s) => s.codec_type === "audio"),
  };
}

/** Names from `ffmpeg -decoders` or `ffmpeg -encoders`: the identifier in each listing line. */
export function parseCodecList(text) {
  const names = new Set();
  for (const line of String(text).split("\n")) {
    const m = /^\s*[A-Z.]{6}\s+(\S+)/.exec(line);
    if (m && m[1] !== "=") names.add(m[1]);
  }
  return names;
}

/** Output codecs the pipeline can write, by the container they suit. */
export const OUTPUT_CODECS = {
  h264: { encoder: "libx264", pixelFormat: "yuv420p", containers: ["mp4", "mov", "mkv"], quality: (crf) => ["-crf", String(crf), "-preset", "medium"] },
  hevc: { encoder: "libx265", pixelFormat: "yuv420p", containers: ["mp4", "mov", "mkv"], quality: (crf) => ["-crf", String(crf), "-preset", "medium", "-tag:v", "hvc1"] },
  prores: { encoder: "prores_ks", pixelFormat: "yuv422p10le", containers: ["mov"], quality: () => ["-profile:v", "3"] },
  vp9: { encoder: "libvpx-vp9", pixelFormat: "yuv420p", containers: ["webm", "mkv"], quality: (crf) => ["-crf", String(crf), "-b:v", "0", "-row-mt", "1"] },
};

/** The codec for an output file: the one asked for, or the usual one for its container. */
export function outputCodec(out, asked) {
  const ext = String(out).toLowerCase().split(".").pop();
  const codec = asked ?? (ext === "webm" ? "vp9" : "h264");
  const spec = OUTPUT_CODECS[codec];
  if (!spec) throw new PipelineError("codec-unknown", `"${codec}" is not an output codec.`, `Use ${Object.keys(OUTPUT_CODECS).join(", ")}.`);
  if (!spec.containers.includes(ext)) throw new PipelineError("container-codec", `A .${ext} file cannot hold ${codec}.`, `Use .${spec.containers.join(" or .")}.`);
  return { codec, ...spec, container: ext };
}

/**
 * The frames to process: `from` and `to` are seconds (or `frames` when they end in "f"), within the video. A range past
 * the video is clamped with a warning, or refused, as the config's `outOfRange` says.
 */
export function frameRange(info, from, to, outOfRange = "clamp") {
  const warnings = [], total = info.duration !== undefined ? Math.floor(info.duration * info.fpsValue + 1e-6) : undefined;
  const parse = (value, fallback) => {
    if (value === undefined) return fallback;
    const m = /^(\d+(?:\.\d+)?)(f?)$/.exec(String(value).trim());
    if (!m) throw new PipelineError("time-invalid", `"${value}" is not a time.`, "Give seconds (2.5) or frames (75f).");
    return m[2] ? Number(m[1]) : Math.round(Number(m[1]) * info.fpsValue);
  };
  let start = parse(from, 0), end = parse(to, total);
  if (end === undefined) throw new PipelineError("duration-unknown", `${info.file} does not state its length.`, "Give --to.");
  const limit = total ?? end;
  for (const [name, value] of [["start", start], ["end", end]]) {
    if (value < 0 || value > limit) {
      const message = `The ${name} (frame ${value}) is outside the video's ${limit} frames.`;
      if (outOfRange === "error") throw new PipelineError("time-range", message);
      warnings.push(message + " It is clamped.");
    }
  }
  start = Math.min(limit, Math.max(0, start));
  end = Math.min(limit, Math.max(0, end));
  if (end <= start) throw new PipelineError("time-empty", `The range from frame ${start} to ${end} has no frames.`);
  return { start, end, count: end - start, warnings };
}

/** FFmpeg arguments that decode `count` frames from `start` as raw RGBA on stdout, at the video's own rate, scaled to `size` if given. */
export function decodeArgs(info, start, count, size) {
  const fps = `${info.fps.num}/${info.fps.den}`;
  return ["-v", "error", "-nostdin", "-ss", (start * info.fps.den / info.fps.num).toFixed(6), "-i", info.file, "-map", "0:v:0",
    // A variable frame rate is held to the stated average, so frame n is always at time n / fps.
    "-vf", `fps=${fps}${size ? `,scale=${size.width}:${size.height}:flags=lanczos` : ""}`, "-frames:v", String(count), "-f", "rawvideo", "-pix_fmt", "rgba", "pipe:1"];
}

/** FFmpeg arguments that encode raw RGBA frames from stdin into `out`, carrying the source's audio for the same span. */
export function encodeArgs(info, out, codec, range, options = {}) {
  const fps = `${info.fps.num}/${info.fps.den}`, seconds = (frames) => (frames * info.fps.den / info.fps.num).toFixed(6);
  const audio = info.audio && options.audio !== false;
  return ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${info.width}x${info.height}`, "-r", fps, "-i", "pipe:0",
    ...audio ? ["-ss", seconds(range.start), "-t", seconds(range.count), "-i", info.file, "-map", "0:v:0", "-map", "1:a:0?", "-c:a", codec.container === "webm" ? "libopus" : "aac", "-b:a", "192k"] : ["-map", "0:v:0"],
    "-c:v", codec.encoder, "-pix_fmt", codec.pixelFormat, ...codec.quality(options.crf ?? 18), "-r", fps,
    ...codec.container === "mp4" || codec.container === "mov" ? ["-movflags", "+faststart"] : [], "-shortest", out];
}

/** A logger that writes levels at or above `level` to `write` (stderr by default). */
export function createLogger(level = "info", write = (line) => process.stderr.write(line + "\n"), name = "selective-color") {
  const order = ["debug", "info", "warn", "error"], at = order.indexOf(level);
  if (at < 0) throw new PipelineError("log-level", `"${level}" is not a log level.`, `Use ${order.join(", ")}.`);
  const log = (severity) => (message, details) => { if (order.indexOf(severity) >= at) write(`[${name}] ${severity}: ${message}${details ? " " + JSON.stringify(details) : ""}`); };
  return { debug: log("debug"), info: log("info"), warn: log("warn"), error: log("error") };
}
