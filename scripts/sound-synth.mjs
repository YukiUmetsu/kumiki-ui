#!/usr/bin/env node
/** Original science and technology sounds, synthesized by FFmpeg from fixed recipes, and added to the catalog.
 *   npm run sound:synth            Make the files, measure them, and write their catalog records.
 * The recipes are data below: each is an FFmpeg `aevalsrc` expression for left and right, a length and a fade. FFmpeg's expression
 * evaluator is deterministic, so the same recipe always gives the same file and the same hash. These sounds are this project's own
 * work, under its MIT licence. Restraint is the style: short, soft and low in the mix, never an alarm.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decode, loudness } from "./sound-catalog.mjs";
import { readWavFormat } from "../registry/video/sound-catalog.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), ".."), DIR = join(ROOT, "assets/sound"), FILE = join(DIR, "catalog.json"), OUT = "kumiki/tech";
const env = (attack, decay) => `(1-exp(-t*${attack}))*exp(-t*${decay})`;
/** Each recipe: expressions for left and right (t is seconds), length, fades in seconds, and catalog text. */
const RECIPES = [
  { id: "tech-pulse-soft", seconds: .6, fadeOut: .15, tags: ["tech", "pulse", "ding", "chime", "notification", "soft", "short"],
    description: "A soft notification ding: a high note over its octave below, gone in half a second.",
    left: `0.5*(sin(2*PI*1046.5*t)*${env(900, 14)}+0.35*sin(2*PI*523.25*t)*${env(600, 9)})`, right: null },
  { id: "tech-scan-sweep", seconds: 1.4, fadeOut: .25, tags: ["tech", "scan", "sweep", "rise", "science", "data", "diagram"],
    description: "A smooth rising scan: a tone sweeping upward with a breath of noise, as a sensor passes over something.",
    left: `0.32*sin(PI*t/1.4)*(sin(2*PI*(220*t+800*t*t))+0.12*(2*random(0)-1))`, right: `0.32*sin(PI*t/1.4)*(sin(2*PI*(221*t+801*t*t))+0.12*(2*random(1)-1))` },
  { id: "tech-digital-glitch", seconds: 1.0, fadeOut: .2, tags: ["tech", "glitch", "digital", "stutter", "data", "error", "transition"],
    description: "A short stuttering digital glitch: noise clicks at irregular moments, for data, an error or a quick transition.",
    left: `st(0,floor((t+0)*30));st(1,sin(ld(0)*12.9898+0)*43758.5453);st(2,gt(ld(1)-floor(ld(1)),0.3));st(3,mod(t+0,1/30));0.55*ld(2)*lt(ld(3),0.006)*exp(-ld(3)*900)*(0.7*(2*random(0)-1)+0.3*sin(2*PI*1800*t))`, right: `st(0,floor((t+0.011)*30));st(1,sin(ld(0)*12.9898+1)*43758.5453);st(2,gt(ld(1)-floor(ld(1)),0.3));st(3,mod(t+0.011,1/30));0.55*ld(2)*lt(ld(3),0.006)*exp(-ld(3)*900)*(0.7*(2*random(1)-1)+0.3*sin(2*PI*1800*t))` },
  { id: "tech-activate", seconds: .8, fadeOut: .2, tags: ["tech", "activate", "on", "confirm", "rise", "two-tone", "success"],
    description: "A gentle two-step rise, a fourth then a fifth up, for something switching on.",
    left: `0.42*(if(lt(t,0.18),sin(2*PI*440*t)*(1-exp(-t*400)),0)+if(gte(t,0.18),(sin(2*PI*659.25*t)+0.25*sin(2*PI*1318.5*t))*(1-exp(-(t-0.18)*400))*exp(-(t-0.18)*5),0))`, right: null },
  { id: "tech-shimmer", seconds: 1.8, fadeOut: .5, tags: ["tech", "shimmer", "sparkle", "hologram", "reveal", "science", "air"],
    description: "A high, airy shimmer of four bell partials with a slow tremolo, for a reveal or a hologram.",
    left: `0.16*(1-exp(-t*8))*exp(-t*1.4)*(1+0.35*sin(2*PI*7*t))*(sin(2*PI*2093*t)+sin(2*PI*2637*t)+0.8*sin(2*PI*3136*t)+0.5*sin(2*PI*4186*t))`,
    right: `0.16*(1-exp(-t*8))*exp(-t*1.4)*(1+0.35*sin(2*PI*7*t+1.2))*(sin(2*PI*2095*t)+sin(2*PI*2639*t)+0.8*sin(2*PI*3139*t)+0.5*sin(2*PI*4190*t))` },
  { id: "tech-ui-click", seconds: .16, fadeOut: .05, tags: ["tech", "ui", "click", "tap", "button", "interface", "short"],
    description: "A small, clean interface click with a faint bright ring.",
    left: `0.6*(sin(2*PI*2200*t)*exp(-t*90)+0.4*sin(2*PI*4400*t)*exp(-t*160))*(1-exp(-t*3000))`, right: null },
];

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
/** The catalog's quiet accents (tones, stings, foley) sit near -23 LUFS, so these do too. Short sounds are measured with silence after
 * them, because loudness needs at least one 400 ms block. */
const TARGET_LUFS = -23;
const render = (recipe, file, gainDb) => {
  const right = recipe.right ?? recipe.left;
  const run = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", `aevalsrc=exprs='${recipe.left}|${right}':s=48000:d=${recipe.seconds}`,
    "-af", `afade=t=out:st=${(recipe.seconds - recipe.fadeOut).toFixed(3)}:d=${recipe.fadeOut},volume=${gainDb.toFixed(2)}dB`, "-c:a", "pcm_s24le", "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", file], { encoding: "utf8" });
  if (run.status !== 0) throw Error(`FFmpeg could not make ${recipe.id}: ${run.stderr}`);
};
const measured = file => {
  const padded = file.replace(/\.wav$/, ".measure.wav");
  spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", file, "-af", "apad=pad_dur=1", padded]);
  const level = loudness(padded);
  spawnSync("rm", ["-f", padded]);
  return level;
};
mkdirSync(join(DIR, OUT), { recursive: true });
const catalog = JSON.parse(readFileSync(FILE, "utf8")), today = new Date().toISOString().slice(0, 10), made = [];
for (const recipe of RECIPES) {
  const path = `${OUT}/${recipe.id}.wav`, file = join(DIR, path);
  // Render once to measure, then again at the gain that brings it to the catalog's level. The gain is rounded, so it is stable.
  render(recipe, file, 0);
  // Never past a -3 dBTP ceiling: sparse clicks reach the loudness target only by pushing their peaks too high.
  const first = measured(file), gain = Math.round(Math.min(TARGET_LUFS - first.integratedLufs, -3 - first.truePeakDbtp) * 10) / 10;
  render(recipe, file, gain);
  const bytes = readFileSync(file), wav = readWavFormat(bytes), samples = decode(file);
  // The sync point is the loudest moment, so a cue lands on what the ear hears first.
  let peak = 0, at = 0;
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) > peak) { peak = Math.abs(samples[i]); at = i; }
  const level = measured(file);
  made.push({ id: recipe.id, path, sha256: sha256(bytes), channels: wav.channels, sampleRate: wav.sampleRate, bitDepth: wav.bitDepth, durationSamples: wav.durationSamples,
    peakSeconds: Number((at / 48000).toFixed(3)), loudnessLufs: Math.round(level.integratedLufs), underVoiceoverDb: -10, tags: recipe.tags, description: recipe.description,
    sourceUrl: "https://github.com/YukiUmetsu/kumiki-ui/blob/main/scripts/sound-synth.mjs", author: "Kumiki UI", licenseId: "MIT", origin: "synthesized",
    redistributable: true, allowedUses: ["commercial-video", "library-distribution"], verifiedAt: today });
  console.log(`${recipe.id.padEnd(18)} ${(wav.durationSamples / 48000).toFixed(2)} s, peak at ${(at / 48000).toFixed(3)} s, ${level.integratedLufs} LUFS, true peak ${level.truePeakDbtp} dBTP`);
}
const ids = new Set(made.map(sound => sound.id)), sounds = [...catalog.sounds.filter(sound => !ids.has(sound.id)), ...made].sort((a, b) => a.id.localeCompare(b.id, "en"));
writeFileSync(FILE, JSON.stringify({ ...catalog, sounds }, null, 1) + "\n");
console.log(`Wrote ${made.length} sounds. The catalog has ${sounds.length}.`);
