#!/usr/bin/env node
/** Original activation sound, using Blender's saved event frame and Kumiki's existing mix contract.
 * node scripts/build-product-hero-audio.mjs <Blender source.json> <new output directory>
 */
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { createAudioMixManifest, audioMixFfmpegArgs } from "../registry/video/audio-visual-cue.ts";

const [sourceFile, target] = process.argv.slice(2);
if (!sourceFile || !target) throw Error("Provide Blender's source.json and a new output directory.");
const source = JSON.parse(await readFile(resolve(sourceFile), "utf8"));
if (!Number.isSafeInteger(source.audioAnchorFrame) || source.audioAnchorFrame < 0 || source.audioAnchorFrame >= source.durationFrames)
  throw Error("Blender metadata needs an audioAnchorFrame inside its duration. Rebuild the source revision.");
const directory = resolve(target);
if (await access(join(directory, "mix.wav")).then(() => true, () => false)) throw Error("This audio revision already exists; use a new output directory.");
await mkdir(directory, { recursive: true });
const run = (args) => new Promise((done, fail) => {
  const process = spawn("ffmpeg", args, { cwd: directory, stdio: ["ignore", "ignore", "pipe"] });
  let log = ""; process.stderr.on("data", chunk => { log += chunk; });
  process.once("error", fail); process.once("close", code => code === 0 ? done() : fail(Error(`FFmpeg sound build failed (${code}): ${log.slice(-1200)}`)));
});
const synth = (name, expression, duration) => run(["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i",
  `aevalsrc=${expression}:s=48000:d=${duration}`, "-ac", "2", "-c:a", "pcm_s16le", name]);
// Designed activation transient, not claimed to be a recording of a physical switch.
await synth("activation.wav", "0.23*sin(2*PI*960*t)*exp(-65*t)*min(1\\,t/0.001)", .12);
const note = (hz, start) => `if(gte(t\\,${start})\\,0.20*(sin(2*PI*${hz}*(t-${start}))+0.18*sin(2*PI*${hz*2}*(t-${start})))*exp(-2.7*(t-${start}))*min(1\\,(t-${start})/0.012)\\,0)`;
await synth("motif.wav", [note(220,0), note(329.6276,.28), note(440,.56)].join("+"), 2.8);
const cues = { id: "product-activation", fps: source.fps, durationFrames: source.durationFrames,
  lanes: [{ id: "activation", kind: "sfx", startFrame: source.audioAnchorFrame, assetRef: "activation.wav", gainDb: -4 },
    { id: "motif", kind: "music", startFrame: source.audioAnchorFrame + 4, assetRef: "motif.wav", gainDb: -5 }] };
const manifest = createAudioMixManifest(cues);
await writeFile(join(directory, "cues.json"), JSON.stringify(cues, null, 2) + "\n");
await writeFile(join(directory, "mix-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
await run(audioMixFfmpegArgs(manifest, "mix.wav", { sampleRate: 48000 }));
console.log(`Original 48 kHz stereo activation mix: ${join(directory, "mix.wav")}`);
