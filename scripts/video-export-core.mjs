/** Pure helpers for the optional video exporter: FFmpeg arguments and output verification.
 * No browser, no filesystem, no network. Covered by tests/video-export.test.mjs.
 */

/** Rational FPS as FFmpeg expects it, e.g. {num:30,den:1} -> "30/1". */
export const frameRateArg = fps => fps.num + "/" + fps.den;

/** FFmpeg arguments for one streamed encode: PNG frames on stdin, optional audio file, H.264 + AAC.
 * Frames are piped in as they are captured, so no frame is ever written to disk.
 */
export function ffmpegEncodeArgs({ fps, outputPath, audioPath, startSeconds = 0, frames }) {
  const rate = frameRateArg(fps), duration = frames * fps.den / fps.num;
  const args = ["-hide_banner", "-loglevel", "error", "-y",
    "-f", "image2pipe", "-c:v", "png", "-framerate", rate, "-i", "pipe:0"];
  if (audioPath) args.push("-ss", String(startSeconds), "-i", audioPath);
  args.push("-map", "0:v:0");
  if (audioPath) args.push("-map", "1:a:0");
  args.push("-c:v", "libx264", "-crf", "19", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", rate, "-t", String(duration));
  if (audioPath) args.push("-c:a", "aac", "-b:a", "192k");
  else args.push("-an");
  args.push("-movflags", "+faststart", outputPath);
  return args;
}

/** ffprobe arguments that report container streams, plus the number of frames actually decoded. */
export const ffprobeVerifyArgs = path => ["-v", "error", "-count_frames", "-show_format", "-show_streams", "-of", "json", path];

/** Check a parsed ffprobe report against what the encoder was asked to produce.
 * Returns problems as strings; an empty list means the file is verified.
 */
export function verifyExportProbe(probe, expected) {
  const problems = [];
  const streams = probe?.streams ?? [];
  const video = streams.find(s => s.codec_type === "video");
  const audio = streams.find(s => s.codec_type === "audio");
  const frameSeconds = expected.fps.den / expected.fps.num;
  // Video must match within half a frame. Audio gets 1.5 frames: AAC framing and priming add up to ~1 AAC frame.
  const tolerance = frameSeconds / 2 + 1e-6, audioTolerance = frameSeconds * 1.5;
  if (!video) return ["No video stream in the export."];
  if (video.codec_name !== "h264") problems.push("Video codec is " + video.codec_name + ", expected h264.");
  if (video.width !== expected.width || video.height !== expected.height)
    problems.push("Video is " + video.width + "×" + video.height + ", expected " + expected.width + "×" + expected.height + ".");
  if (video.r_frame_rate !== frameRateArg(expected.fps))
    problems.push("Frame rate is " + video.r_frame_rate + ", expected " + frameRateArg(expected.fps) + ".");
  const decoded = Number(video.nb_read_frames);
  if (decoded !== expected.frames)
    problems.push("Decoded " + video.nb_read_frames + " video frames, expected " + expected.frames + ".");
  const videoSeconds = Number(video.duration ?? probe.format?.duration);
  if (!Number.isFinite(videoSeconds) || Math.abs(videoSeconds - expected.frames * frameSeconds) > tolerance)
    problems.push("Video duration " + videoSeconds + "s, expected " + (expected.frames * frameSeconds).toFixed(3) + "s.");
  if (expected.audio) {
    if (!audio) problems.push("Audio was supplied but the export has no audio stream.");
    else if (Math.abs(Number(audio.duration) - expected.frames * frameSeconds) > audioTolerance)
      problems.push("Audio duration " + audio.duration + "s does not match the " + (expected.frames * frameSeconds).toFixed(3) + "s picture.");
  } else if (audio) problems.push("Export unexpectedly contains an audio stream.");
  return problems;
}

/** Output path used while encoding; renamed onto the requested path only after verification. */
export const partialPathFor = output => output.replace(/\.mp4$/i, "") + ".partial.mp4";

/** Split [start, start+frames) into consecutive segments of at most segmentFrames frames. */
export function segmentPlan(start, frames, segmentFrames) {
  const plan = [];
  for (let offset = 0; offset < frames; offset += segmentFrames)
    plan.push({ start: start + offset, frames: Math.min(segmentFrames, frames - offset) });
  return plan;
}

/** Stable file name for a segment; the frame range is part of the name so a changed plan never reuses it. */
export const segmentFileName = segment => "seg-" + segment.start + "-" + segment.frames + ".mp4";

/** ffconcat list for the concat demuxer. Single quotes in paths are escaped for FFmpeg's quoting. */
export const concatListText = paths => paths.map(path => "file '" + path.replace(/'/g, "'\\''") + "'\n").join("");

/** FFmpeg arguments that join video-only segments without re-encoding and add the audio from the full mix. */
export function ffmpegConcatArgs({ fps, listPath, outputPath, audioPath, startSeconds = 0, frames }) {
  const rate = frameRateArg(fps), duration = frames * fps.den / fps.num;
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", listPath];
  if (audioPath) args.push("-ss", String(startSeconds), "-i", audioPath, "-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-b:a", "192k");
  else args.push("-map", "0:v:0", "-an");
  args.push("-c:v", "copy", "-r", rate, "-t", String(duration), "-movflags", "+faststart", outputPath);
  return args;
}
