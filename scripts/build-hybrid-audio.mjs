#!/usr/bin/env node
/** Build the hybrid short's soundtrack from its cue sheet: narration (macOS `say`), a 120 BPM beat bed, a ding and a
 * whoosh, mixed by the library's own audio manifest. No media is committed; the output goes to the directory you name.
 *   node scripts/build-hybrid-audio.mjs <output-dir>
 * Narration words are placed at their authored slots. A word longer than its slot is sped up to fit (never
 * stretched, never moved). Requires macOS `say` with the Samantha voice, and ffmpeg on PATH.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const outDir = resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Usage: node scripts/build-hybrid-audio.mjs <output-dir>");

const { createAudioMixManifest, audioMixFfmpegArgs } = await import("../registry/video/audio-visual-cue.ts");
const { HYBRID_NARRATION, HYBRID_SHEET } = await import("../src/video/hybrid-short-data.ts");

const SAMPLE_RATE = 48000, VOICE = "Samantha", RATE_WPM = 190;

const run = (bin, args, cwd = process.cwd()) => new Promise((resolveRun, reject) => {
  const proc = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"], cwd });
  let stderr = "";
  proc.stderr.on("data", chunk => { stderr += chunk; });
  proc.once("error", reject);
  proc.once("close", code => code === 0 ? resolveRun() : reject(new Error(bin + " exited with " + code + ": " + stderr.trim().split("\n").slice(-2).join(" "))));
});
const probeSeconds = path => new Promise((resolveProbe, reject) => {
  const proc = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], { stdio: ["ignore", "pipe", "inherit"] });
  let text = "";
  proc.stdout.on("data", chunk => { text += chunk; });
  proc.once("error", reject);
  proc.once("close", code => code === 0 ? resolveProbe(Number(text)) : reject(new Error("ffprobe failed for " + path)));
});
/** atempo accepts 0.5–2.0 per filter; chain filters for larger ratios. */
const tempoChain = ratio => {
  const filters = [];
  let remaining = ratio;
  while (remaining > 2.0 + 1e-9) { filters.push("atempo=2.0"); remaining /= 2.0; }
  if (remaining > 1 + 1e-9) filters.push("atempo=" + remaining.toFixed(4));
  return filters;
};

await mkdir(outDir, { recursive: true });

// 1. Narration: one clip per word, trimmed of silence, fitted to its slot.
const words = [];
for (let i = 0; i < HYBRID_NARRATION.length; i += 1) {
  const [text, start, end] = HYBRID_NARRATION[i];
  const aiff = join(outDir, "word-" + i + ".aiff"), wav = join(outDir, "word-" + i + ".wav");
  await run("say", ["-v", VOICE, "-r", String(RATE_WPM), "-o", aiff, text]);
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", aiff, "-ac", "1", "-ar", String(SAMPLE_RATE),
    "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse", wav]);
  const spoken = await probeSeconds(wav);
  const slot = end - start;
  const ratio = spoken > slot ? spoken / slot : 1;
  words.push({ wav, start, ratio, text, spoken, slot });
}
const voiceArgs = ["-y"], voiceFilters = [];
words.forEach((word, i) => {
  voiceArgs.push("-i", word.wav);
  const tempo = word.ratio > 1 ? tempoChain(word.ratio).map(f => f + ",").join("") : "";
  voiceFilters.push("[" + i + ":a]" + tempo + "adelay=" + Math.round(word.start * 1000) + ":all=1[w" + i + "]");
});
const labels = words.map((_, i) => "[w" + i + "]").join("");
voiceFilters.push(labels + "amix=inputs=" + words.length + ":normalize=0:duration=longest,apad=whole_dur=" + HYBRID_SHEET.durationFrames * HYBRID_SHEET.fps.den / HYBRID_SHEET.fps.num + ",atrim=0:" + HYBRID_SHEET.durationFrames * HYBRID_SHEET.fps.den / HYBRID_SHEET.fps.num + "[out]");
await run("ffmpeg", [...voiceArgs, "-hide_banner", "-loglevel", "error", "-filter_complex", voiceFilters.join(";"), "-map", "[out]", "-ar", String(SAMPLE_RATE), join(outDir, "voice.wav")]);

// 2. Beat bed (120 BPM: a click every 0.5 s), ding and whoosh, all generated from formulas.
const seconds = HYBRID_SHEET.durationFrames * HYBRID_SHEET.fps.den / HYBRID_SHEET.fps.num;
await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
  "aevalsrc=exprs='0.5*sin(2*PI*1200*mod(t\\,0.5))*exp(-40*mod(t\\,0.5))':s=" + SAMPLE_RATE + ":d=" + seconds, join(outDir, "music.wav")]);
await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
  "aevalsrc=exprs='0.6*sin(2*PI*1320*t)*exp(-4*t)':s=" + SAMPLE_RATE + ":d=0.8", join(outDir, "ding.wav")]);
await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
  "anoisesrc=d=0.7:c=pink:a=0.4:r=" + SAMPLE_RATE + ",highpass=f=400,lowpass=f=3000,afade=t=in:d=0.25,afade=t=out:st=0.35:d=0.35", join(outDir, "whoosh.wav")]);

// 3. Mix by the library's manifest, so every start time comes from the cue sheet.
// The manifest uses asset names relative to the output folder, so FFmpeg runs there.
const manifest = createAudioMixManifest(HYBRID_SHEET);
await run("ffmpeg", audioMixFfmpegArgs(manifest, "mix.wav", { sampleRate: SAMPLE_RATE }), outDir);

await writeFile(join(outDir, "narration-fit.json"), JSON.stringify(words.map(({ text, start, slot, spoken, ratio }) => ({
  text, startSeconds: start, slotSeconds: Number(slot.toFixed(3)), spokenSeconds: Number(spoken.toFixed(3)), speedUp: Number(ratio.toFixed(3)),
})), null, 2) + "\n");
process.stdout.write("Built " + join(outDir, "mix.wav") + " (" + seconds.toFixed(3) + " s). Narration fit report: narration-fit.json\n");
